from crewai import Agent, Task
from agents.config import get_llm, query_database_tool

def get_procurement_orchestrator_agent():
    return Agent(
        role="Adaptive Procurement Orchestrator",
        goal="Identify and rank alternative crude oil sources and safe logistics routes, factoring in spot market pricing, tanker availability, port congestion, refinery grade compatibility, and shipping emissions.",
        backstory="""You are the director of international crude sourcing and shipping logistics.
You specialize in rapid alternative sourcing under supply shocks. You assess spot pricing, coordinate tanker types (VLCC, Suezmax), 
estimate port queue times, and verify the chemical compatibility of replacement crude grades with specific Indian refineries.
To meet modern corporate sustainability standards, you also compute CO2 shipping emissions and produce carbon-balanced alternative supply recommendations.""",
        llm=get_llm(),
        tools=[query_database_tool],
        verbose=True
    )

def get_procurement_orchestrator_task(agent):
    return Task(
        description="""Read the simulated scenario and refinery run rate impacts from the Disruption Scenario Modeller.
To ensure data consistency:
1. Query the `scenario_modeller_logs` table where `run_id = '{run_id}'` to read the daily refinery supply shortfalls, refinery run-rate drops, and Days-to-Stockout (DTS) metrics.
2. Query the database and build a ranked list of procurement recommendations to cover these shortfalls:
   - Identify all alternative suppliers (e.g. US Gulf Coast, West Africa) producing compatible crude grades.
   - Factor in 'tanker availability' (simulate tanker cost/availability based on distance and vessel type in the database).
   - Factor in 'port congestion' (simulate a congestion multiplier for ports; assume some ports have 1-3 days delays).
   - Calculate 'shipping carbon emissions' (estimate metric tons of CO2 based on shipping volume, vessel type, and transit distance/days).
   - Extract the latest spot prices and apply any price increases projected by the Scenario Modeller.
3. Create two distinct rankings:
   - 'Cost-Optimized Ranking' (prioritizing lowest procurement and transit costs).
   - 'ESG-Optimized/Green Ranking' (prioritizing lowest shipping carbon emissions and shorter alternate shipping paths).
Output the recommendations in JSON format.""",
        expected_output="""A JSON object containing:
- 'cost_optimized_options' (list of dictionaries ordered by financial rank, containing:
  - 'rank' (integer)
  - 'refinery_id'
  - 'supplier_id'
  - 'crude_grade'
  - 'volume_barrels'
  - 'transit_time_days'
  - 'estimated_port_congestion_days'
  - 'crude_cost_usd_per_barrel'
  - 'total_cost_usd'
  - 'co2_emissions_metric_tons'
  - 'esg_score' (0-100, where higher is lower emissions)
  - 'route_id')
- 'esg_optimized_options' (list of dictionaries ordered by lowest CO2 emissions, containing the same fields)
- 'ranking_methodology_comparison' (string describing the trade-offs between cost/time and ESG/carbon footprints)""",
        agent=agent
    )
