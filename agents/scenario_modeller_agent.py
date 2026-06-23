from crewai import Agent, Task
from agents.config import get_llm, query_database_tool

def get_scenario_modeller_agent():
    return Agent(
        role="Disruption Scenario Modeller",
        goal="Simulate specific disruption events (Hormuz partial closure, OPEC+ cuts, Red Sea suspension) and compute cascading impacts on refinery run rates, domestic fuel prices, power sector stress, and GDP trajectory.",
        backstory="""You are a senior macro-economist and energy systems modeller.
You specialize in translating supply disruptions into direct refinery operational impacts and national macroeconomic variables.
You model how chokepoint closures and crude grade shortages force refineries to lower their utilization capacity, spark surges in retail fuel costs, strain the power grid (due to fuel oil shortages), and drag down GDP growth rates.
Furthermore, you calculate the specific physical Days-to-Stockout buffer for each refinery, reflecting how long they can survive on current inventory alone.""",
        llm=get_llm(),
        tools=[query_database_tool],
        verbose=True
    )

def get_scenario_modeller_task(agent):
    return Task(
        description="""Read the threat and disruption probabilities from the Geopolitical Risk Intelligence Analyst.
To ensure data consistency:
1. Query the `risk_agent_logs` table where `run_id = '{run_id}'` to read the threat assessment, disruption probabilities, and risk trend.
2. Identify if any of the three specific events are occurring: 'Strait of Hormuz partial closure', 'OPEC+ emergency cut', or 'Red Sea shipping suspension' (or equivalent severe risk event in those areas).
3. Simulate the cascading impacts under the active scenario:
   - Query refinery current inventories and calculate the refinery Days-to-Stockout (DTS) based on current daily consumption (derived from capacity) and blocked incoming volumes.
   - Calculate the reduction in refinery run rates (utilization %) for each refinery (Jamnagar, Kochi, Paradip) due to crude feed bottlenecks.
   - Estimate the rise in domestic fuel prices (retail petrol/diesel price increase in INR per litre).
   - Compute the power sector stress index (scale of 0 to 10) and specify downstream power grid blackout risk levels for region-specific grids (Western Grid, Southern Grid, Eastern Grid) which rely on refinery feedstock or fuel oil.
   - Project the GDP trajectory drag (in basis points or GDP % reduction over the quarter).
4. Output the results in a structured JSON payload.""",
        expected_output="""A JSON object containing:
- 'simulated_scenario_name' (string)
- 'refinery_run_rates' (dictionary mapping refinery ID to current vs projected utilization %, e.g., {'REF_JAMNAGAR': {'normal_utilization': 98.0, 'projected_utilization': 78.0}})
- 'refinery_days_to_stockout' (dictionary mapping refinery ID to number of days of buffer left before complete refinery shutdown, e.g. {'REF_JAMNAGAR': 15})
- 'domestic_fuel_price_impact' (dictionary showing retail price change in INR, e.g. {'petrol_increase_inr_per_litre': 8.50, 'diesel_increase_inr_per_litre': 7.20})
- 'power_grid_stress' (dictionary containing:
  - 'overall_stress_index' (0-10 scale)
  - 'regional_blackout_probabilities' (dictionary mapping grids like 'Western Grid', 'Southern Grid', 'Eastern Grid' to probability percentages, e.g. {'Southern Grid': 35%})
  - 'gwh_risk_estimate')
- 'gdp_trajectory_drag_bps' (float or integer, representing the basis points reduction, e.g., 45 bps)
- 'simulation_rationale' (string describing the mathematical cascading impact logic including the inventory draw calculations)""",
        agent=agent
    )
