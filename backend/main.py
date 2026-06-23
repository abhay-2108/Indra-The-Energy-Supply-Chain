import os
import sys
import json
import sqlite3
import uuid
import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.config import query_db, try_parse_json, make_task_callback, DB_PATH
from agents.risk_agent import get_risk_agent, get_risk_task
from agents.scenario_modeller_agent import get_scenario_modeller_agent, get_scenario_modeller_task
from agents.procurement_orchestrator_agent import get_procurement_orchestrator_agent, get_procurement_orchestrator_task
from agents.spr_optimisation_agent import get_spr_optimisation_agent, get_spr_optimisation_task
from agents.digital_twin_agent import get_digital_twin_agent, get_digital_twin_task
from crewai import Crew, Process

app = FastAPI(title="Energy Supply Chain Resilience Multi-Agent Backend")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """
    Initializes separate database log tables for each agent and RAG tables.
    """
    from agents.rag_utils import init_rag_tables
    init_rag_tables()
    agent_names = ["risk_agent", "scenario_modeller", "procurement_orchestrator", "spr_optimisation", "digital_twin"]
    with sqlite3.connect(DB_PATH) as conn:
        cursor = conn.cursor()
        for name in agent_names:
            cursor.execute(f'''
                CREATE TABLE IF NOT EXISTS {name}_logs (
                    run_id TEXT PRIMARY KEY,
                    timestamp TEXT DEFAULT (datetime('now', 'localtime')),
                    scenario_type TEXT,
                    raw_output TEXT,
                    parsed_json TEXT
                );
            ''')
        conn.commit()

class SimulationRequest(BaseModel):
    scenario_type: str = "hormuz_closure"
    custom_briefing: str = ""

@app.get("/api/infrastructure")
def get_infrastructure():
    try:
        refineries = query_db("SELECT * FROM refineries")
        suppliers = query_db("SELECT * FROM suppliers")
        sprs = query_db("SELECT * FROM spr_inventory")
        return {
            "refineries": refineries,
            "suppliers": suppliers,
            "spr_inventory": sprs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/routes")
def get_routes():
    try:
        routes = query_db("SELECT * FROM routes")
        for r in routes:
            if "geojson_path" in r and r["geojson_path"]:
                try:
                    r["geometry"] = json.loads(r["geojson_path"])
                except Exception:
                    r["geometry"] = None
        return routes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/shipments")
def get_shipments():
    try:
        shipments = query_db("SELECT * FROM active_shipments")
        return shipments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/events")
def get_events():
    try:
        events = query_db("SELECT * FROM geopolitical_events_log ORDER BY date DESC LIMIT 50")
        return events
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/prices")
def get_prices():
    try:
        prices = query_db("SELECT * FROM historical_market_prices ORDER BY date DESC LIMIT 100")
        return prices
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/runs")
def get_all_runs():
    """
    Returns a list of all historical simulation runs.
    Uses the digital_twin_logs table as the indicator of a completed execution run.
    """
    try:
        runs = query_db("SELECT run_id, timestamp, scenario_type FROM digital_twin_logs ORDER BY timestamp DESC")
        return runs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/runs/{run_id}")
def get_run_details(run_id: str):
    """
    Returns the step-by-step agent logs and outputs for a specific run ID.
    """
    try:
        tables = {
            "risk_agent": "risk_agent_logs",
            "scenario_modeller": "scenario_modeller_logs",
            "procurement_orchestrator": "procurement_orchestrator_logs",
            "spr_optimisation": "spr_optimisation_logs",
            "digital_twin": "digital_twin_logs"
        }
        
        run_data = {}
        for key, table in tables.items():
            result = query_db(f"SELECT * FROM {table} WHERE run_id = ?", (run_id,))
            if result:
                row = result[0]
                if "parsed_json" in row and row["parsed_json"]:
                    try:
                        row["result"] = json.loads(row["parsed_json"])
                    except Exception:
                        row["result"] = None
                run_data[key] = row
            else:
                run_data[key] = None
        return run_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/simulate")
def run_simulation(req: SimulationRequest):
    """
    Kicks off the Multi-Agent Crew to run a simulation against the current DB state,
    generating a unique run_id and saving agent results separately in the DB.
    """
    try:
        # Generate unique run ID
        run_id = f"run_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        print(f"[API] Initializing CrewAI Agents for run {run_id} ({req.scenario_type})...")
        
        risk_agent = get_risk_agent()
        scenario_modeller_agent = get_scenario_modeller_agent()
        procurement_orchestrator_agent = get_procurement_orchestrator_agent()
        spr_optimisation_agent = get_spr_optimisation_agent()
        digital_twin_agent = get_digital_twin_agent()
        
        risk_task = get_risk_task(risk_agent)
        risk_task.callback = make_task_callback(run_id, req.scenario_type, "risk_agent")
        
        scenario_modeller_task = get_scenario_modeller_task(scenario_modeller_agent)
        scenario_modeller_task.context = [risk_task]
        scenario_modeller_task.callback = make_task_callback(run_id, req.scenario_type, "scenario_modeller")
        
        procurement_orchestrator_task = get_procurement_orchestrator_task(procurement_orchestrator_agent)
        procurement_orchestrator_task.context = [scenario_modeller_task]
        procurement_orchestrator_task.callback = make_task_callback(run_id, req.scenario_type, "procurement_orchestrator")
        
        spr_optimisation_task = get_spr_optimisation_task(spr_optimisation_agent)
        spr_optimisation_task.context = [procurement_orchestrator_task, scenario_modeller_task]
        spr_optimisation_task.callback = make_task_callback(run_id, req.scenario_type, "spr_optimisation")
        
        digital_twin_task = get_digital_twin_task(digital_twin_agent)
        digital_twin_task.context = [
            risk_task, 
            scenario_modeller_task, 
            procurement_orchestrator_task, 
            spr_optimisation_task
        ]
        digital_twin_task.callback = make_task_callback(run_id, req.scenario_type, "digital_twin")
        
        crew = Crew(
            agents=[
                risk_agent,
                scenario_modeller_agent,
                procurement_orchestrator_agent,
                spr_optimisation_agent,
                digital_twin_agent
            ],
            tasks=[
                risk_task,
                scenario_modeller_task,
                procurement_orchestrator_task,
                spr_optimisation_task,
                digital_twin_task
            ],
            process=Process.sequential,
            verbose=True
        )
        
        print(f"[API] Running sequential multi-agent execution for run {run_id}...")
        crew.kickoff(inputs={
            "run_id": run_id, 
            "scenario_type": req.scenario_type, 
            "custom_briefing": req.custom_briefing
        })
        
        # Extract individual task results from task output objects using the fixed '.raw' property
        risk_out = try_parse_json(risk_task.output.raw if risk_task.output else "")
        scenario_out = try_parse_json(scenario_modeller_task.output.raw if scenario_modeller_task.output else "")
        procurement_out = try_parse_json(procurement_orchestrator_task.output.raw if procurement_orchestrator_task.output else "")
        spr_out = try_parse_json(spr_optimisation_task.output.raw if spr_optimisation_task.output else "")
        digital_twin_out = try_parse_json(digital_twin_task.output.raw if digital_twin_task.output else "")
        
        return {
            "status": "success",
            "run_id": run_id,
            "scenario": req.scenario_type,
            "agent_steps": {
                "risk_agent": {
                    "role": risk_agent.role,
                    "result": risk_out
                },
                "scenario_modeller": {
                    "role": scenario_modeller_agent.role,
                    "result": scenario_out
                },
                "procurement_orchestrator": {
                    "role": procurement_orchestrator_agent.role,
                    "result": procurement_out
                },
                "spr_optimisation_agent": {
                    "role": spr_optimisation_agent.role,
                    "result": spr_out
                }
            },
            "digital_twin_payload": digital_twin_out
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents")
def list_documents():
    try:
        from agents.rag_utils import init_rag_tables
        init_rag_tables()
        docs = query_db("SELECT id, filename, uploaded_at, file_size FROM intel_documents ORDER BY uploaded_at DESC")
        for d in docs:
            chunks = query_db("SELECT COUNT(*) as count FROM intel_chunks WHERE doc_id = ?", (d["id"],))
            d["chunks_count"] = chunks[0]["count"] if chunks else 0
        return docs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        from agents.rag_utils import add_document
        contents = await file.read()
        doc_id, chunks_count = add_document(file.filename, contents)
        return {
            "status": "success",
            "doc_id": doc_id,
            "filename": file.filename,
            "chunks_count": chunks_count
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{doc_id}")
def remove_document(doc_id: str):
    try:
        from agents.rag_utils import delete_document
        delete_document(doc_id)
        return {"status": "success", "message": f"Document {doc_id} and its vector chunks deleted successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/search")
def search_documents(query: str):
    try:
        from agents.rag_utils import search_briefings_library
        results = search_briefings_library(query, limit=5)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
