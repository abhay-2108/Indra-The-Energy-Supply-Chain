import os
import sys
import json
import uuid
import datetime
import asyncio
from fastapi import FastAPI, Request, HTTPException, UploadFile, File, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.config import query_db, try_parse_json, make_task_callback
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
async def startup_event():
    """
    Initializes separate database log tables for each agent, RAG tables, and starts AIS stream processing.
    """
    from agents.config import execute_db, query_db, IS_POSTGRES
    
    # 0. Self-heal/Bootstrapping: Auto-migrate SQLite schema to Postgres if empty
    if IS_POSTGRES:
        try:
            res_tables = query_db("SELECT 1 FROM information_schema.tables WHERE table_name='refineries'")
            if not res_tables:
                print("[Startup Bootstrapper] PostgreSQL tables not found. Automatically running SQLite to Postgres migration...")
                import sqlite3
                from agents.config import get_db_connection
                from data.migrate_to_postgres import migrate_relational_data, migrate_vector_data
                
                base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                sqlite_db_path = os.path.join(base_dir, "data", "supply_chain.db")
                
                sqlite_conn = sqlite3.connect(sqlite_db_path)
                pg_conn = get_db_connection()
                
                migrate_relational_data(sqlite_conn, pg_conn)
                migrate_vector_data(sqlite_conn)
                
                sqlite_conn.close()
                pg_conn.close()
                print("[Startup Bootstrapper] Automatic database migration completed successfully!")
        except Exception as mig_e:
            print(f"[Startup Bootstrapper Error] Automatic migration failed: {mig_e}")

    from agents.rag_utils import init_rag_tables
    init_rag_tables()
    
    # 1. Initialize agent log tables
    agent_names = ["risk_agent", "scenario_modeller", "procurement_orchestrator", "spr_optimisation", "digital_twin"]
    for name in agent_names:
        if IS_POSTGRES:
            execute_db(f'''
                CREATE TABLE IF NOT EXISTS {name}_logs (
                    run_id TEXT PRIMARY KEY,
                    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                    scenario_type TEXT,
                    raw_output TEXT,
                    parsed_json TEXT
                );
            ''')
        else:
            execute_db(f'''
                CREATE TABLE IF NOT EXISTS {name}_logs (
                    run_id TEXT PRIMARY KEY,
                    timestamp TEXT DEFAULT (datetime('now', 'localtime')),
                    scenario_type TEXT,
                    raw_output TEXT,
                    parsed_json TEXT
                );
            ''')

    # 2. Ensure route_progress column exists in active_shipments
    try:
        if IS_POSTGRES:
            res = query_db("""
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='active_shipments' AND column_name='route_progress'
            """)
            if not res:
                execute_db("ALTER TABLE active_shipments ADD COLUMN route_progress DOUBLE PRECISION DEFAULT 0.0")
        else:
            cols = query_db("PRAGMA table_info(active_shipments)")
            if not any(c['name'] == 'route_progress' for c in cols):
                execute_db("ALTER TABLE active_shipments ADD COLUMN route_progress REAL DEFAULT 0.0")
    except Exception as db_e:
        print(f"[Startup Database Alter] Warning adding route_progress: {db_e}")

    # 3. Start AIS Stream Processor Tasks
    from backend.stream_processor import start_stream_processor
    asyncio.create_task(start_stream_processor())

@app.on_event("shutdown")
async def shutdown_event():
    """
    Stops background AIS stream pipelines on app exit.
    """
    from backend.stream_processor import stop_stream_processor
    await stop_stream_processor()

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

def execute_crew_background(run_id: str, scenario_type: str, custom_briefing: str, gemini_key: str = None, nvidia_key: str = None):
    """
    Background worker function running multi-agent execution in a separate thread.
    Updates DB logs as progress completes.
    """
    try:
        from agents.config import gemini_key_var, nvidia_key_var
        gemini_key_var.set(gemini_key)
        nvidia_key_var.set(nvidia_key)
        
        print(f"[Background Task] Starting CrewAI execution for run {run_id} ({scenario_type})...")
        
        # Load agents
        risk_agent = get_risk_agent()
        scenario_modeller_agent = get_scenario_modeller_agent()
        procurement_orchestrator_agent = get_procurement_orchestrator_agent()
        spr_optimisation_agent = get_spr_optimisation_agent()
        digital_twin_agent = get_digital_twin_agent()
        
        # Load tasks
        risk_task = get_risk_task(risk_agent)
        risk_task.callback = make_task_callback(run_id, scenario_type, "risk_agent")
        
        scenario_modeller_task = get_scenario_modeller_task(scenario_modeller_agent)
        scenario_modeller_task.context = [risk_task]
        scenario_modeller_task.callback = make_task_callback(run_id, scenario_type, "scenario_modeller")
        
        procurement_orchestrator_task = get_procurement_orchestrator_task(procurement_orchestrator_agent)
        procurement_orchestrator_task.context = [scenario_modeller_task]
        procurement_orchestrator_task.callback = make_task_callback(run_id, scenario_type, "procurement_orchestrator")
        
        spr_optimisation_task = get_spr_optimisation_task(spr_optimisation_agent)
        spr_optimisation_task.context = [procurement_orchestrator_task, scenario_modeller_task]
        spr_optimisation_task.callback = make_task_callback(run_id, scenario_type, "spr_optimisation")
        
        digital_twin_task = get_digital_twin_task(digital_twin_agent)
        digital_twin_task.context = [
            risk_task, 
            scenario_modeller_task, 
            procurement_orchestrator_task, 
            spr_optimisation_task
        ]
        digital_twin_task.callback = make_task_callback(run_id, scenario_type, "digital_twin")
        
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
        
        crew.kickoff(inputs={
            "run_id": run_id, 
            "scenario_type": scenario_type, 
            "custom_briefing": custom_briefing
        })
        print(f"[Background Task] CrewAI execution completed successfully for run {run_id}")
    except Exception as e:
        print(f"[Background Task Error] Failed running crew for run {run_id}: {e}")
        # Log failure state to digital_twin_logs table
        try:
            from agents.config import save_agent_output
            error_payload = {"status": "failed", "error": str(e)}
            save_agent_output(run_id, scenario_type, "digital_twin", f"Error: {e}", error_payload)
        except Exception as db_e:
            print(f"[Background Task Error Logging Failure] {db_e}")

@app.post("/api/simulate")
def run_simulation(req: SimulationRequest, background_tasks: BackgroundTasks, request: Request):
    """
    Kicks off the Multi-Agent Crew to run in the background, returning a pending run_id immediately.
    """
    try:
        gemini_key = request.headers.get("x-gemini-api-key")
        nvidia_key = request.headers.get("x-nvidia-api-key")
        
        # Generate unique run ID
        run_id = f"run_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        print(f"[API] Scheduling CrewAI Agents for run {run_id} ({req.scenario_type}) in background...")
        
        background_tasks.add_task(execute_crew_background, run_id, req.scenario_type, req.custom_briefing, gemini_key, nvidia_key)
        
        return {
            "status": "pending",
            "run_id": run_id,
            "scenario": req.scenario_type,
            "message": "Simulation started in background."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/ws/run/{run_id}")
async def websocket_run(websocket: WebSocket, run_id: str):
    await websocket.accept()
    try:
        tables = {
            "risk_agent": "risk_agent_logs",
            "scenario_modeller": "scenario_modeller_logs",
            "procurement_orchestrator": "procurement_orchestrator_logs",
            "spr_optimisation": "spr_optimisation_logs",
            "digital_twin": "digital_twin_logs"
        }
        
        sent_status = {key: False for key in tables}
        
        failed = False
        while True:
            # Poll database for new log entries
            for key, table in tables.items():
                if not sent_status[key]:
                    rows = query_db(f"SELECT * FROM {table} WHERE run_id = ?", (run_id,))
                    if rows:
                        row_dict = rows[0]
                        parsed_json = None
                        if "parsed_json" in row_dict and row_dict["parsed_json"]:
                            try:
                                parsed_json = json.loads(row_dict["parsed_json"])
                            except Exception:
                                pass
                        
                        payload = {
                            "type": "agent_log",
                            "agent": key,
                            "timestamp": row_dict.get("timestamp"),
                            "raw_output": row_dict.get("raw_output"),
                            "result": parsed_json
                        }
                        await websocket.send_json(payload)
                        sent_status[key] = True
                        
                        # Break immediately if the final twin reports failure to avoid getting stuck in polling
                        if key == "digital_twin" and parsed_json and parsed_json.get("status") == "failed":
                            await websocket.send_json({"type": "failed", "error": parsed_json.get("error")})
                            failed = True
                            break
            
            if failed:
                break
                
            # Check if all completed
            if all(sent_status.values()):
                await websocket.send_json({"type": "complete", "run_id": run_id})
                break
                
            await asyncio.sleep(1.0)
            
    except WebSocketDisconnect:
        print(f"[WS Disconnect] Client closed connection for run {run_id}")
    except Exception as e:
        print(f"[WS Error] Exception in websocket: {e}")

@app.get("/api/documents")
def list_documents():
    try:
        from agents.rag_utils import init_rag_tables, get_document_chunk_count
        init_rag_tables()
        docs = query_db("SELECT id, filename, uploaded_at, file_size FROM intel_documents ORDER BY uploaded_at DESC")
        for d in docs:
            d["chunks_count"] = get_document_chunk_count(d["id"])
        return docs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload")
async def upload_document(request: Request, file: UploadFile = File(...)):
    try:
        gemini_key = request.headers.get("x-gemini-api-key")
        nvidia_key = request.headers.get("x-nvidia-api-key")
        from agents.config import gemini_key_var, nvidia_key_var
        g_token = gemini_key_var.set(gemini_key)
        n_token = nvidia_key_var.set(nvidia_key)
        
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
        finally:
            gemini_key_var.reset(g_token)
            nvidia_key_var.reset(n_token)
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
def search_documents(query: str, request: Request):
    try:
        gemini_key = request.headers.get("x-gemini-api-key")
        nvidia_key = request.headers.get("x-nvidia-api-key")
        from agents.config import gemini_key_var, nvidia_key_var
        g_token = gemini_key_var.set(gemini_key)
        n_token = nvidia_key_var.set(nvidia_key)
        
        try:
            from agents.rag_utils import search_briefings_library
            results = search_briefings_library(query, limit=5)
            return results
        finally:
            gemini_key_var.reset(g_token)
            nvidia_key_var.reset(n_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
