from crewai import Agent, Task
from agents.config import get_llm, query_database_tool

def get_digital_twin_agent():
    return Agent(
        role="Supply Chain Digital Twin Analyst",
        goal="Maintain a geospatial simulation of India's energy supply network from wellhead to refinery to distribution/SPR, enabling continuous 'what-if' analysis.",
        backstory="""You are a geospatial systems engineer and supply chain architect.
You manage the digital twin replica of India's crude oil infrastructure. You map physical suppliers, shipping routes, transiting vessels, 
domestic refiners, and strategic reserves. You synthesize raw agent analysis into visual overlays that show the 'before' and 'after' of a chokepoint block, 
highlighting single points of failure and mapping economic sensitivity zones for downstream distribution.""",
        llm=get_llm(),
        tools=[query_database_tool],
        verbose=True
    )

def get_digital_twin_task(agent):
    return Task(
        description="""Gather the outputs from the Geopolitical Risk Analyst, Energy Market Economist, Adaptive Procurement Orchestrator, and SPR Optimisation Agent.
To ensure data consistency:
1. Query the following four upstream logs tables for this run's data where `run_id = '{run_id}'`:
   - `risk_agent_logs` (for risk trend, chokepoint/supplier threat levels)
   - `scenario_modeller_logs` (for run rates, Days-to-Stockout buffers, power sector stress)
   - `procurement_orchestrator_logs` (for alternate shipping routes, CO2 emissions, cost vs green rankings)
   - `spr_optimisation_logs` (for drawdown releases, remaining coverage, financial refilling cost)
2. Compare the 'Baseline' (normal operations, active shipments, default routes in the database) against the 'Disrupted Scenario' (blocked chokepoints, redirected routes, emergency SPR drawdowns).
3. Query refinery locations, SPR cavern capacities, supplier ports, routes (retrieving GeoJSON geometries), and active shipments.
4. Identify 'Single Points of Failure' (SPOFs) in the network (e.g. refineries with zero inventory buffers or high dependency on a single blocked supplier).
5. Compute a 'Sensitivity Heatmap' layer representing regional fuel supply strain (Western, Southern, Eastern zones) if the disruption duration doubles.
6. Consolidate these layers into a single geospatial simulation JSON payload.
Ensure it includes a clear comparison of baseline vs disruption metrics, a vessels layer, a routes layer (with GeoJSON lines for normal vs alternative paths), status markers for all nodes (suppliers, refineries, and SPRs), and the sensitivity zone overlays.""",
        expected_output="""A JSON object containing:
- 'scenario_comparison':
  - 'scenario_name'
  - 'is_disrupted'
  - 'baseline_vs_disrupted_kpis' (total cost, daily supply gap, national days of cover, fuel price delta)
  - 'single_points_of_failure' (list of refinery or port IDs marked as critical vulnerabilities)
- 'geospatial_layers':
  - 'vessels_layer' (list of simulated ships with coordinates, cargo, and status: IN_TRANSIT, BLOCKED, REROUTED)
  - 'routes_layer' (list of Route features with GeoJSON geometries, labeled as ACTIVE, BLOCKED, or ALTERNATIVE)
  - 'nodes_layer' (refineries and SPR sites with status, capacities, and coordinates)
  - 'alert_zones' (chokepoints under security warning with lat/long and risk probability)
  - 'sensitivity_heatmap' (dictionary mapping regions like 'North', 'West', 'South', 'East' to economic drag index and supply risk levels, e.g., {'South': {'economic_drag_score': 8.4, 'risk_status': 'HIGH'}} )""",
        agent=agent
    )
