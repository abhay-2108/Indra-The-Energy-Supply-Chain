from crewai import Agent, Task
from agents.config import get_llm, query_database_tool, search_briefings_library_tool

def get_procurement_orchestrator_agent():
    return Agent(
        role="Adaptive Procurement Orchestrator",
        goal="Identify and rank alternative crude oil sources and safe logistics routes, factoring in spot market pricing, tanker availability, port congestion, refinery grade compatibility, and shipping emissions.",
        backstory="""You are the director of international crude sourcing and shipping logistics.
You specialize in rapid alternative sourcing under supply shocks. You assess spot pricing, coordinate tanker types (VLCC, Suezmax), 
estimate port queue times, and verify the chemical compatibility of replacement crude grades with specific Indian refineries.
To meet modern corporate sustainability standards, you also compute CO2 shipping emissions and produce carbon-balanced alternative supply recommendations.""",
        llm=get_llm(),
        tools=[query_database_tool, search_briefings_library_tool],
        verbose=True
    )

def get_procurement_orchestrator_task(agent):
    return Task(
        description="""Read the simulated scenario and refinery run rate impacts from the Disruption Scenario Modeller.
To ensure data consistency:
1. Query the `scenario_modeller_logs` table where `run_id = '{run_id}'` to read the daily refinery supply shortfalls, refinery run-rate drops, and Days-to-Stockout (DTS) metrics.
2. Query the briefings library using `search_briefings_library_tool` for matching documents (e.g. searching for refinery sweet/sour capability, sweet crude blending rules, transit guidelines, or historical chokepoint alerts).
3. Query the database and build a ranked list of procurement recommendations to cover these shortfalls:
   - Identify alternative suppliers producing compatible grades.
   - CRITICAL REQUIREMENT: If strict crude compatibility is not met during a disruption (e.g., REF_PARADIP requires 'High-Sulfur' crude but Middle East sour suppliers SUP_SAUDI/SUP_IRAQ are disrupted or blocked), you MUST relax the compatibility constraint. Recommend sweet crude alternatives (from US Gulf Coast 'SUP_US_GULF' or West Africa 'SUP_NIGERIA') as a blending option to prevent refinery shutdown, rather than returning empty lists.
   - CRITICAL REQUIREMENT: The database 'routes' table only has a few direct routes. If a route for a recommended alternative supplier-refinery pair is missing from the database (e.g., US Gulf or Nigeria to REF_PARADIP, or Nigeria to REF_JAMNAGAR), you MUST still suggest the sourcing cargo. Estimate logistically sound synthetic route attributes:
     * US Gulf to India West Coast: ~35 days. US Gulf to India East Coast (Paradip): ~40-45 days.
     * West Africa (Nigeria) to India West Coast: ~22 days. West Africa (Nigeria) to India East Coast (Paradip): ~25-28 days.
     * Generate a synthetic route ID matching the pattern, e.g., 'RT_US_PARADIP' or 'RT_NIGERIA_PARADIP'.
   - Factor in 'tanker availability' (simulate tanker cost/availability based on distance and vessel type in the database).
   - Factor in 'port congestion' (simulate a congestion multiplier for ports; assume some ports have 1-3 days delays).
   - Calculate 'shipping carbon emissions' (estimate metric tons of CO2 based on shipping volume, vessel type, and transit distance/days).
   - Extract the latest spot prices and apply any price increases projected by the Scenario Modeller.
   - All refinery, supplier, and route IDs returned MUST be the exact string identifiers from the database (e.g., 'REF_JAMNAGAR', 'SUP_SAUDI', 'RT_SAUDI_JAMNAGAR' or synthetic ones like 'RT_US_PARADIP') and NEVER integers or generic names.
4. Create two distinct rankings:
   - 'Cost-Optimized Ranking' (prioritizing lowest procurement and transit costs).
   - 'ESG-Optimized/Green Ranking' (prioritizing lowest shipping carbon emissions and shorter alternate shipping paths).
   - NEVER return empty lists for 'cost_optimized_options' or 'esg_optimized_options' if alternative supply is physically available.
5. In 'ranking_methodology_comparison', explain the trade-offs, and explicitly note where compatibility constraints were relaxed, specifying which refineries are utilizing sweet crude blending and any operational notes.
Output the recommendations in JSON format.""",
        expected_output="""A JSON object containing:
- 'cost_optimized_options' (list of dictionaries ordered by financial rank, containing:
  - 'rank' (integer)
  - 'refinery_id' (string, e.g. 'REF_JAMNAGAR')
  - 'supplier_id' (string, e.g. 'SUP_US_GULF')
  - 'crude_grade' (string)
  - 'volume_barrels' (integer)
  - 'transit_time_days' (integer or float)
  - 'estimated_port_congestion_days' (integer or float)
  - 'crude_cost_usd_per_barrel' (number)
  - 'total_cost_usd' (number)
  - 'co2_emissions_metric_tons' (number)
  - 'esg_score' (0-100, where higher is lower emissions)
  - 'route_id' (string, e.g. 'RT_US_JAMNAGAR' or 'RT_US_PARADIP'))
- 'esg_optimized_options' (list of dictionaries ordered by lowest CO2 emissions, containing the same fields)
- 'ranking_methodology_comparison' (string describing the trade-offs between cost/time and ESG/carbon footprints, and detailing blending relaxations)""",
        agent=agent
    )

