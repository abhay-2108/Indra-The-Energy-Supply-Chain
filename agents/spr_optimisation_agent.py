from crewai import Agent, Task
from agents.config import get_llm, query_database_tool

def get_spr_optimisation_agent():
    return Agent(
        role="Strategic Petroleum Reserve (SPR) Optimisation Agent",
        goal="Model optimal emergency SPR drawdown schedules against supply gap forecasts, refinery demand curves, and replenishment window estimates, incorporating refill pricing curves.",
        backstory="""You are an emergency inventory strategist and policymaker advisor for India's national security council.
You evaluate strategic stockpiles and optimize drawdowns during shipping disruptions.
You ensure that refinery demand curves (daily barrel consumption requirements) are met by calculating SPR releases (subject to max drawdown rates)
and matching them against the replenishment window. In addition, you model the economic cost of replenishment (future refill cost) based on forward price curves.""",
        llm=get_llm(),
        tools=[query_database_tool],
        verbose=True
    )

def get_spr_optimisation_task(agent):
    return Task(
        description="""Read the ranked procurement recommendations and refinery shortfalls.
To ensure data consistency:
1. Query the `scenario_modeller_logs` table where `run_id = '{run_id}'` to read the daily refinery supply shortfalls and refinery demand.
2. Query the `procurement_orchestrator_logs` table where `run_id = '{run_id}'` to read the recommended procurement plan, including transit times and alternative shipping paths.
3. Model an optimal SPR drawdown plan to cover the supply gaps before the new shipments arrive:
   - Identify the 'replenishment window' for each refinery based on the transit times of the top ranked procurement recommendations.
   - Query `spr_inventory` to get the capacities, current levels, and maximum drawdown rates (bpd) of the SPR caverns (Padur, Mangaluru, Vizag).
   - Compute the daily refinery demand curves (capacity required to run) and find the net daily gap (demand minus current available inventory).
   - Allocate SPR drawdowns over the replenishment window. Ensure that no SPR drawdown rate exceeds its `max_drawdown_bpd`.
   - Calculate the remaining buffer in terms of 'days of cover' (total remaining SPR inventory divided by average daily consumption).
   - Calculate 'operational drawdown cost' (drawdown pumping cost) and project the 'replenishment cost delta' (the cost to refill the caverns after the crisis passes, estimating spot price stabilization curves).
4. Output a detailed policy-maker decision support document in JSON format.""",
        expected_output="""A JSON object containing:
- 'drawdown_schedule' (list of dictionaries representing the daily release plan:
  - 'spr_id'
  - 'refinery_id'
  - 'drawdown_rate_bpd'
  - 'duration_days'
  - 'total_allocated_barrels')
- 'replenishment_window_days' (integer, time required before alternative procurement arrives)
- 'spr_depletion_forecast' (dictionary showing:
  - 'spr_id'
  - 'pre_event_barrels'
  - 'post_event_barrels'
  - 'percent_depleted')
- 'post_crisis_days_of_cover' (float, remaining national strategic cover in days)
- 'financial_metrics':
  - 'operational_drawdown_cost_usd'
  - 'estimated_refill_cost_usd' (cost to replenish reserves post-crisis)
  - 'refill_price_strategy' (string advising whether to buy in contango or wait for backwardation to resolve)
- 'policymaker_recommendation_summary' (string explaining drawdown prioritization and national risk buffer strategy)""",
        agent=agent
    )
