from crewai import Agent, Task
from agents.config import get_llm, query_database_tool, search_briefings_library_tool

def get_risk_agent():
    return Agent(
        role="Geopolitical Risk Intelligence Analyst",
        goal="Produce a live, continuously updated supply disruption probability score by corridor and supplier by ingesting news, shipping AIS positions, sanctions, and commodity price signals.",
        backstory="""You are an elite energy intelligence officer specializing in global maritime chokepoints, naval security, and commodity market stress.
You monitor real-time shipping AIS positions, spot price anomalies, sanctions registries, and intelligence news logs.
Your core strength is quantifying uncertainty into a clear 'Disruption Probability Score' (0.0 to 1.0) for every major shipping corridor (e.g. Strait of Hormuz, Red Sea) and supplier (e.g. Saudi Aramco, SOMO Iraq), updated dynamically based on signals.
In addition, you project the risk trend and identify early-warning hedging triggers for procurement teams.""",
        llm=get_llm(),
        tools=[query_database_tool, search_briefings_library_tool],
        verbose=True
    )

def get_risk_task(agent):
    return Task(
        description="""Analyze the latest geopolitical events log, historical market prices, active shipments (AIS data simulation), and route configurations from the database.
If a custom briefing is provided: '{custom_briefing}', prioritize analyzing it as the latest real-time geopolitical intelligence signal. You must parse this briefing, identify which corridor (e.g. Strait of Hormuz, Red Sea) or supplier is affected, and calculate disruption probabilities accordingly, overriding database defaults if there is a conflict. If no custom briefing is provided (i.e. it is empty or blank), focus on the database records and standard scenario type '{scenario_type}'.
1. Search the briefings library using `search_briefings_library_tool` with queries relevant to '{scenario_type}' or the custom briefing '{custom_briefing}' to extract policy guidelines, cargo routing constraints, or historical warnings.
2. Query `geopolitical_events_log` for severe events, checking for chokepoint threat keywords matching the scenario '{scenario_type}' (Hormuz, Red Sea, Suez, Cape, etc.).
3. Query `historical_market_prices` to identify sudden price spikes in sour or sweet crude grades that indicate market-wide supply panic.
4. Query `active_shipments` (AIS data) to assess vessel status and count of active transits near chokepoints.
5. Calculate a 'Disruption Probability Score' (0.0 to 1.0) for each corridor (transit_chokepoint in routes table) and for each supplier.
6. Determine a 'Risk Trend' (STABLE, ELEVATING, or CRITICAL) based on the frequency and severity of events in the last 10 days.
7. Evaluate a 'Hedging Trigger Flag' (True/False): Set to True if any key corridor disruption probability exceeds 0.70 or if price volatility is extreme.
8. Summarize active risk factors, including maritime threats, sanctions pressure, market price spikes, and policy guidance from the briefings library.
Output the analysis in a structured JSON format.""",
        expected_output="""A JSON object containing:
- 'disruption_probability_by_corridor' (dictionary, e.g. {'Strait of Hormuz': 0.85, 'Cape of Good Hope': 0.10})
- 'disruption_probability_by_supplier' (dictionary, e.g. {'SUP_SAUDI': 0.70, 'SUP_IRAQ': 0.70, 'SUP_US_GULF': 0.05, 'SUP_NIGERIA': 0.15})
- 'risk_trend' (string: 'STABLE', 'ELEVATING', or 'CRITICAL')
- 'hedging_trigger' (boolean: True if strategic hedging or supply-source locks are recommended immediately)
- 'sanctions_status' (dictionary indicating active sanctions restrictions on suppliers if any)
- 'market_price_signals' (dictionary summarizing recent price volatility or spikes)
- 'key_threat_summary' (string describing the risk landscape)""",
        agent=agent
    )
