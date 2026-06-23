import os
import sys

# Add project root (parent directory) to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crewai import Crew, Process
from agents.config import make_task_callback
from agents.risk_agent import get_risk_agent, get_risk_task
from agents.scenario_modeller_agent import get_scenario_modeller_agent, get_scenario_modeller_task
from agents.procurement_orchestrator_agent import get_procurement_orchestrator_agent, get_procurement_orchestrator_task
from agents.spr_optimisation_agent import get_spr_optimisation_agent, get_spr_optimisation_task
from agents.digital_twin_agent import get_digital_twin_agent, get_digital_twin_task

def run_resilience_crew(scenario_type="manual_test"):
    print(f"[Orchestrator] Initializing CrewAI Agents for scenario: {scenario_type}...")
    risk_agent = get_risk_agent()
    scenario_modeller_agent = get_scenario_modeller_agent()
    procurement_orchestrator_agent = get_procurement_orchestrator_agent()
    spr_optimisation_agent = get_spr_optimisation_agent()
    digital_twin_agent = get_digital_twin_agent()
    
    print("[Orchestrator] Setting up CrewAI Tasks...")
    risk_task = get_risk_task(risk_agent)
    risk_task.callback = make_task_callback(scenario_type, "risk_agent")
    
    # Setup context-aware inputs for tasks
    scenario_modeller_task = get_scenario_modeller_task(scenario_modeller_agent)
    scenario_modeller_task.context = [risk_task]
    scenario_modeller_task.callback = make_task_callback(scenario_type, "scenario_modeller")
    
    procurement_orchestrator_task = get_procurement_orchestrator_task(procurement_orchestrator_agent)
    procurement_orchestrator_task.context = [scenario_modeller_task]
    procurement_orchestrator_task.callback = make_task_callback(scenario_type, "procurement_orchestrator")
    
    spr_optimisation_task = get_spr_optimisation_task(spr_optimisation_agent)
    spr_optimisation_task.context = [procurement_orchestrator_task, scenario_modeller_task]
    spr_optimisation_task.callback = make_task_callback(scenario_type, "spr_optimisation")
    
    digital_twin_task = get_digital_twin_task(digital_twin_agent)
    digital_twin_task.context = [
        risk_task, 
        scenario_modeller_task, 
        procurement_orchestrator_task, 
        spr_optimisation_task
    ]
    digital_twin_task.callback = make_task_callback(scenario_type, "digital_twin")
    
    print("[Orchestrator] Wiring Crew...")
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
    
    print(f"[Orchestrator] Kicking off Multi-Agent Simulation for run {run_id}...")
    result = crew.kickoff(inputs={"run_id": run_id, "scenario_type": scenario_type})
    return result

if __name__ == "__main__":
    result = run_resilience_crew("manual_test_run")
    print("\n--- FINAL GEOSPATIAL DIGITAL TWIN PAYLOAD ---")
    print(result)
