import os
import sqlite3
import json
from crewai import LLM
from crewai.tools import tool

# Determine base directory and database path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "supply_chain.db")

def query_db(query, params=()):
    """Executes a SQL query against the SQLite database and returns a list of dictionaries."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]

def try_parse_json(text):
    if not text:
        return {}
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except Exception:
        return {"raw_text": text}

def save_agent_output(run_id, scenario_type, agent_name, raw_output, parsed_json_dict=None):
    """
    Saves an agent's execution output to its specific database log table.
    """
    parsed_str = json.dumps(parsed_json_dict) if parsed_json_dict else None
    table_name = f"{agent_name}_logs"
    
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        # Ensure the specific logs table exists
        cursor.execute(f'''
            CREATE TABLE IF NOT EXISTS {table_name} (
                run_id TEXT PRIMARY KEY,
                timestamp TEXT DEFAULT (datetime('now', 'localtime')),
                scenario_type TEXT,
                raw_output TEXT,
                parsed_json TEXT
            );
        ''')
        cursor.execute(f'''
            INSERT OR REPLACE INTO {table_name} (run_id, scenario_type, raw_output, parsed_json)
            VALUES (?, ?, ?, ?)
        ''', (run_id, scenario_type, raw_output, parsed_str))
        conn.commit()

def make_task_callback(run_id, scenario_type, agent_name):
    """
    Creates a callback function for CrewAI tasks to log execution results in the specific DB table.
    """
    def callback(task_output):
        raw_text = task_output.raw
        parsed = try_parse_json(raw_text)
        save_agent_output(run_id, scenario_type, agent_name, raw_text, parsed)
        print(f"[Callback Logger] Saved {agent_name} output to table '{agent_name}_logs' for run {run_id}.")
    return callback

def get_llm():
    """
    Returns an LLM instance, prioritizing Gemini API and falling back to Ollama.
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if gemini_api_key:
        return LLM(
            model="gemini/gemini-1.5-flash",
            temperature=0.2
        )
    
    # Fallback to Ollama
    return LLM(
        model="ollama/qwen2.5:7b",
        base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        temperature=0.2
    )

@tool("Query Database")
def query_database_tool(sql_query: str) -> str:
    """
    Executes a SQL query against the supply chain SQLite database and returns the result as a JSON string.
    Use this to inspect tables:
    - refineries (id, name, capacity_bpd, crude_compatibility, current_inventory_barrels, latitude, longitude)
    - suppliers (id, name, region, crude_grade, max_export_capacity_bpd, port_latitude, port_longitude)
    - routes (id, supplier_id, destination_region, transit_chokepoint, transit_time_days, status, geojson_path)
    - spr_inventory (id, location, capacity_barrels, current_inventory_barrels, max_drawdown_bpd, latitude, longitude)
    - active_shipments (id, vessel_name, vessel_type, supplier_id, refinery_id, route_id, volume_barrels, departure_date, estimated_arrival_date, current_status, current_latitude, current_longitude)
    - historical_market_prices (date, crude_grade, spot_price_usd)
    - geopolitical_events_log (id, date, region, event_description, severity_score)
    - risk_agent_logs (run_id, timestamp, scenario_type, raw_output, parsed_json)
    - scenario_modeller_logs (run_id, timestamp, scenario_type, raw_output, parsed_json)
    - procurement_orchestrator_logs (run_id, timestamp, scenario_type, raw_output, parsed_json)
    - spr_optimisation_logs (run_id, timestamp, scenario_type, raw_output, parsed_json)
    - digital_twin_logs (run_id, timestamp, scenario_type, raw_output, parsed_json)
    """
    try:
        results = query_db(sql_query)
        import json
        return json.dumps(results, indent=2)
    except Exception as e:
        return f"Error executing query: {e}"

@tool("Search Briefings Library")
def search_briefings_library_tool(query: str) -> str:
    """
    Performs a semantic vector search over the uploaded policy briefs, cargo disruption records,
    and intelligence documents. Use this tool to find additional intelligence context, routing guidelines,
    refinery sweet/sour capabilities, or historical warnings for energy security.
    """
    try:
        from agents.rag_utils import search_briefings_library
        results = search_briefings_library(query, limit=5)
        if not results:
            return "No matching documents or briefings found in the library."
        
        formatted = []
        for i, r in enumerate(results):
            formatted.append(
                f"Match {i+1} [File: {r['filename']}, Similarity: {r['similarity']:.2f}]:\n{r['text']}\n"
            )
        return "\n---\n".join(formatted)
    except Exception as e:
        return f"Error searching briefings library: {e}"
