const isClient = typeof window !== 'undefined';
export const API_BASE_URL = isClient 
  ? (window.location.port === '3000' 
      ? `http://${window.location.hostname}:8000/api` 
      : `${window.location.origin}/api`)
  : "http://127.0.0.1:8000/api";

// High-fidelity Mock Data Fallback
export const MOCK_INFRASTRUCTURE = {
  refineries: [
    { id: "REF_JAMNAGAR", name: "Reliance Jamnagar", capacity_bpd: 1400000, crude_compatibility: "Heavy-Sour, Light-Sweet", current_inventory_barrels: 16500000, latitude: 22.3444, longitude: 69.8055 },
    { id: "REF_KOCHI", name: "BPCL Kochi", capacity_bpd: 310000, crude_compatibility: "Sweet, Sour", current_inventory_barrels: 2800000, latitude: 9.9657, longitude: 76.3866 },
    { id: "REF_PARADIP", name: "IOCL Paradip", capacity_bpd: 300000, crude_compatibility: "High-Sulfur", current_inventory_barrels: 1900000, latitude: 20.2796, longitude: 86.6668 }
  ],
  suppliers: [
    { id: "SUP_SAUDI", name: "Saudi Aramco (Ras Tanura)", region: "Middle East", crude_grade: "Arab Light (Sour)", max_export_capacity_bpd: 8000000, port_latitude: 26.6833, port_longitude: 50.15 },
    { id: "SUP_IRAQ", name: "Iraq SOMO (Al Basrah)", region: "Middle East", crude_grade: "Basra Heavy (Sour)", max_export_capacity_bpd: 3500000, port_latitude: 29.9322, port_longitude: 48.4735 },
    { id: "SUP_US_GULF", name: "US Gulf Coast (Galveston)", region: "North America", crude_grade: "WTI (Sweet)", max_export_capacity_bpd: 4000000, port_latitude: 29.3117, port_longitude: -94.7934 },
    { id: "SUP_NIGERIA", name: "Nigeria (Bonny Terminal)", region: "West Africa", crude_grade: "Bonny Light (Sweet)", max_export_capacity_bpd: 1500000, port_latitude: 4.4172, port_longitude: 7.1517 }
  ],
  spr_inventory: [
    { id: "SPR_PADUR", location: "Padur, Karnataka", capacity_barrels: 18300000, current_inventory_barrels: 14200000, max_drawdown_bpd: 300000, latitude: 13.1833, longitude: 74.7833 },
    { id: "SPR_MANGALURU", location: "Mangaluru, Karnataka", capacity_barrels: 11000000, current_inventory_barrels: 8500000, max_drawdown_bpd: 250000, latitude: 12.9141, longitude: 74.8559 },
    { id: "SPR_VIZAG", location: "Visakhapatnam, Andhra Pradesh", capacity_barrels: 9700000, current_inventory_barrels: 9100000, max_drawdown_bpd: 200000, latitude: 17.6868, longitude: 83.2185 }
  ]
};

export const MOCK_ROUTES = [
  { id: "RT_SAUDI_JAMNAGAR", supplier_id: "SUP_SAUDI", destination_region: "India West Coast", transit_chokepoint: "Strait of Hormuz", transit_time_days: 5, status: "BLOCKED", geometry: { type: "LineString", coordinates: [[50.15, 26.6833], [60.0, 20.0], [69.8055, 22.3444]] } },
  { id: "RT_IRAQ_PARADIP", supplier_id: "SUP_IRAQ", destination_region: "India East Coast", transit_chokepoint: "Strait of Hormuz", transit_time_days: 9, status: "BLOCKED", geometry: { type: "LineString", coordinates: [[48.4735, 29.9322], [60.0, 15.0], [86.6668, 20.2796]] } },
  { id: "RT_US_JAMNAGAR", supplier_id: "SUP_US_GULF", destination_region: "India West Coast", transit_chokepoint: "Cape of Good Hope", transit_time_days: 35, status: "SAFE", geometry: { type: "LineString", coordinates: [[-94.7934, 29.3117], [-40.0, 0.0], [18.0, -34.0], [60.0, 5.0], [69.8055, 22.3444]] } },
  { id: "RT_NIGERIA_KOCHI", supplier_id: "SUP_NIGERIA", destination_region: "India West Coast", transit_chokepoint: "None", transit_time_days: 22, status: "SAFE", geometry: { type: "LineString", coordinates: [[7.1517, 4.4172], [18.0, -34.0], [60.0, 5.0], [76.3866, 9.9657]] } }
];

export const MOCK_SHIPMENTS = [
  { id: "SHP_1", vessel_name: "MT Bailey", vessel_type: "VLCC", supplier_id: "SUP_SAUDI", refinery_id: "REF_JAMNAGAR", route_id: "RT_SAUDI_JAMNAGAR", volume_barrels: 2000000, current_status: "BLOCKED", current_latitude: 26.0, current_longitude: 55.0 },
  { id: "SHP_2", vessel_name: "MT Rodgers", vessel_type: "Suezmax", supplier_id: "SUP_IRAQ", refinery_id: "REF_PARADIP", route_id: "RT_IRAQ_PARADIP", volume_barrels: 1000000, current_status: "BLOCKED", current_latitude: 27.5, current_longitude: 52.0 },
  { id: "SHP_3", vessel_name: "MT Falcon", vessel_type: "VLCC", supplier_id: "SUP_US_GULF", refinery_id: "REF_JAMNAGAR", route_id: "RT_US_JAMNAGAR", volume_barrels: 2000000, current_status: "IN_TRANSIT", current_latitude: 5.0, current_longitude: 65.0 },
  { id: "SHP_4", vessel_name: "MT Bonny", vessel_type: "Suezmax", supplier_id: "SUP_NIGERIA", refinery_id: "REF_KOCHI", route_id: "RT_NIGERIA_KOCHI", volume_barrels: 1200000, current_status: "IN_TRANSIT", current_latitude: -10.0, current_longitude: 35.0 }
];

export const MOCK_EVENTS = [
  { id: "EVT_1", date: "2026-06-23", region: "Middle East", event_description: "Strait of Hormuz closed partially after maritime drone strike on tanker", severity_score: 0.85 },
  { id: "EVT_2", date: "2026-06-22", region: "Middle East", event_description: "Naval tensions rise in Persian Gulf; cargo insurance premiums spike 25%", severity_score: 0.65 },
  { id: "EVT_3", date: "2026-06-20", region: "Red Sea", event_description: "Houthi forces step up drone attacks near Bab-el-Mandeb chokepoint", severity_score: 0.75 },
  { id: "EVT_4", date: "2026-06-18", region: "Global", event_description: "OPEC+ signals potential emergency supply cuts in upcoming Vienna meeting", severity_score: 0.40 }
];

export const MOCK_RUNS = [
  { run_id: "run_20260623_101532_h8f3d1", timestamp: "2026-06-23 10:15:32", scenario_type: "hormuz_closure" },
  { run_id: "run_20260622_142011_r3e9a4", timestamp: "2026-06-22 14:20:11", scenario_type: "red_sea_threat" }
];

export const MOCK_RUN_DETAILS = {
  risk_agent: {
    result: {
      disruption_probability_by_corridor: { "Strait of Hormuz": 0.85, "Red Sea": 0.50, "Cape of Good Hope": 0.05 },
      disruption_probability_by_supplier: { "SUP_SAUDI": 0.80, "SUP_IRAQ": 0.75, "SUP_US_GULF": 0.05, "SUP_NIGERIA": 0.10 },
      risk_trend: "CRITICAL",
      hedging_trigger: true,
      sanctions_status: { "SUP_SAUDI": "NONE", "SUP_IRAQ": "MONITORED", "SUP_US_GULF": "NONE" },
      market_price_signals: { "price_escalation": "CRITICAL", "insurance_premium_spike": "25%" },
      key_threat_summary: "Partial blockage of Strait of Hormuz due to regional maritime security incidents has suspended 88% of Middle East crude oil transits, affecting India's core sour crude imports."
    }
  },
  scenario_modeller: {
    result: {
      simulated_scenario_name: "Strait of Hormuz Partial Closure",
      refinery_run_rates: {
        "REF_JAMNAGAR": { "normal_utilization": 98.0, "projected_utilization": 74.0, "barrel_drop": 336000 },
        "REF_KOCHI": { "normal_utilization": 95.0, "projected_utilization": 95.0, "barrel_drop": 0 },
        "REF_PARADIP": { "normal_utilization": 96.0, "projected_utilization": 62.0, "barrel_drop": 102000 }
      },
      refinery_days_to_stockout: { "REF_JAMNAGAR": 11, "REF_KOCHI": 22, "REF_PARADIP": 8 },
      domestic_fuel_price_impact: { "petrol_increase_inr_per_litre": 9.40, "diesel_increase_inr_per_litre": 8.10 },
      power_grid_stress: {
        "overall_stress_index": 7.5,
        "regional_blackout_probabilities": { "Western Grid": 15, "Southern Grid": 40, "Eastern Grid": 10 },
        "gwh_risk_estimate": 450
      },
      gdp_trajectory_drag_bps: 55,
      simulation_rationale: "Middle East supplies to Jamnagar and Paradip are heavily constrained. Paradip's sour crude supply drops by 102k bpd, triggering an 8-day stockout countdown unless alternate sourcing or SPR releases are deployed immediately. Downstream pricing filters through to transportation, dragging GDP by 55 bps."
    }
  },
  procurement_orchestrator: {
    result: {
      cost_optimized_options: [
        { rank: 1, refinery_id: "REF_PARADIP", supplier_id: "SUP_US_GULF", crude_grade: "WTI (Sweet)", volume_barrels: 1000000, transit_time_days: 35, estimated_port_congestion_days: 2, crude_cost_usd_per_barrel: 84.50, total_cost_usd: 84500000, co2_emissions_metric_tons: 450, esg_score: 82, route_id: "RT_US_JAMNAGAR" },
        { rank: 2, refinery_id: "REF_JAMNAGAR", supplier_id: "SUP_NIGERIA", crude_grade: "Bonny Light (Sweet)", volume_barrels: 1500000, transit_time_days: 22, estimated_port_congestion_days: 3, crude_cost_usd_per_barrel: 81.20, total_cost_usd: 121800000, co2_emissions_metric_tons: 620, esg_score: 75, route_id: "RT_NIGERIA_KOCHI" }
      ],
      esg_optimized_options: [
        { rank: 1, refinery_id: "REF_JAMNAGAR", supplier_id: "SUP_NIGERIA", crude_grade: "Bonny Light (Sweet)", volume_barrels: 1500000, transit_time_days: 22, estimated_port_congestion_days: 3, crude_cost_usd_per_barrel: 81.20, total_cost_usd: 121800000, co2_emissions_metric_tons: 620, esg_score: 75, route_id: "RT_NIGERIA_KOCHI" },
        { rank: 2, refinery_id: "REF_PARADIP", supplier_id: "SUP_US_GULF", crude_grade: "WTI (Sweet)", volume_barrels: 1000000, transit_time_days: 35, estimated_port_congestion_days: 2, crude_cost_usd_per_barrel: 84.50, total_cost_usd: 84500000, co2_emissions_metric_tons: 850, esg_score: 65, route_id: "RT_US_JAMNAGAR" }
      ],
      ranking_methodology_comparison: "Cost-optimized prioritizes cheaper crude blending profiles from the US Gulf via Cape of Good Hope, but incurs a 2x carbon emissions surcharge compared to West African imports due to the 35-day transit."
    }
  },
  spr_optimisation: {
    result: {
      drawdown_schedule: [
        { spr_id: "SPR_VIZAG", refinery_id: "REF_PARADIP", drawdown_rate_bpd: 120000, duration_days: 8, total_allocated_barrels: 960000 },
        { spr_id: "SPR_PADUR", refinery_id: "REF_JAMNAGAR", drawdown_rate_bpd: 250000, duration_days: 11, total_allocated_barrels: 2750000 }
      ],
      replenishment_window_days: 35,
      spr_depletion_forecast: {
        "SPR_VIZAG": { "pre_event_barrels": 9700000, "post_event_barrels": 8740000, "percent_depleted": 9.9 },
        "SPR_PADUR": { "pre_event_barrels": 18300000, "post_event_barrels": 15550000, "percent_depleted": 15.0 },
        "SPR_MANGALURU": { "pre_event_barrels": 11000000, "post_event_barrels": 11000000, "percent_depleted": 0.0 }
      },
      post_crisis_days_of_cover: 7.8,
      financial_metrics: {
        "operational_drawdown_cost_usd": 150000,
        "estimated_refill_cost_usd": 24000000,
        "refill_price_strategy": "Advised to hedge refilling purchases in Q4 when Middle East premiums collapse by a projected 14% post-conflict resolution."
      },
      policymaker_recommendation_summary: "Prioritize Visakhapatnam drawdown to IOCL Paradip to bridge the critical 8-day stockout gap until US Gulf cargo arrives on Day 35. Maintain Mangaluru reserves at 100% capacity as secondary buffer."
    }
  },
  digital_twin: {
    result: {
      scenario_comparison: {
        scenario_name: "Strait of Hormuz Partial Closure",
        is_disrupted: true,
        baseline_vs_disrupted_kpis: {
          "total_sourcing_cost_delta_usd": 38200000,
          "national_days_of_cover": 7.8,
          "fuel_price_delta_inr": 8.75,
          "co2_footprint_delta_tons": 1070
        },
        single_points_of_failure: ["REF_PARADIP", "RT_SAUDI_JAMNAGAR"]
      },
      geospatial_layers: {
        vessels_layer: [
          { id: "SHP_1", name: "MT Bailey", lat: 26.0, lng: 55.0, status: "BLOCKED", volume: 2000000 },
          { id: "SHP_3", name: "MT Falcon", lat: 5.0, lng: 65.0, status: "REROUTED", volume: 2000000 }
        ],
        routes_layer: [
          { id: "RT_SAUDI_JAMNAGAR", type: "BLOCKED" },
          { id: "RT_US_JAMNAGAR", type: "ALTERNATIVE" }
        ],
        nodes_layer: [
          { id: "REF_JAMNAGAR", type: "REFINERY", status: "STRESSED", lat: 22.3444, lng: 69.8055 },
          { id: "SPR_VIZAG", type: "SPR", status: "DRAWDOWN", lat: 17.6868, lng: 83.2185 }
        ],
        alert_zones: [
          { name: "Strait of Hormuz", lat: 26.5, lng: 56.2, radius: 150000, probability: 0.85 }
        ],
        sensitivity_heatmap: {
          "North": { "economic_drag_score": 3.2, "risk_status": "LOW" },
          "West": { "economic_drag_score": 5.4, "risk_status": "MEDIUM" },
          "South": { "economic_drag_score": 8.1, "risk_status": "HIGH" },
          "East": { "economic_drag_score": 4.5, "risk_status": "MEDIUM" }
        }
      }
    }
  }
};

// API Fetch wrappers with auto fallback
export async function getInfrastructure() {
  try {
    const res = await fetch(`${API_BASE_URL}/infrastructure`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn("Using mock infrastructure data");
    return MOCK_INFRASTRUCTURE;
  }
}

export async function getRoutes() {
  try {
    const res = await fetch(`${API_BASE_URL}/routes`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn("Using mock routes data");
    return MOCK_ROUTES;
  }
}

export async function getShipments() {
  try {
    const res = await fetch(`${API_BASE_URL}/shipments`, { next: { revalidate: 10 } });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn("Using mock shipments data");
    return MOCK_SHIPMENTS;
  }
}

export async function getEvents() {
  try {
    const res = await fetch(`${API_BASE_URL}/events`, { next: { revalidate: 10 } });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn("Using mock events data");
    return MOCK_EVENTS;
  }
}

export async function getPrices() {
  try {
    const res = await fetch(`${API_BASE_URL}/prices`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn("Using mock prices data");
    // Return mock historical curve
    const grades = ["WTI (Sweet)", "Arab Light (Sour)"];
    return Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      crude_grade: grades[i % 2],
      spot_price_usd: 75.0 + Math.sin(i / 3) * 5 + Math.random()
    }));
  }
}

export async function getRuns() {
  try {
    const res = await fetch(`${API_BASE_URL}/runs`, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn("Using mock runs lists");
    return MOCK_RUNS;
  }
}

export async function getRunDetails(runId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/runs/${runId}`, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn(`Using mock run details for run_id: ${runId}`);
    return MOCK_RUN_DETAILS;
  }
}

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const geminiKey = localStorage.getItem("GEMINI_API_KEY");
    const nvidiaKey = localStorage.getItem("NVIDIA_API_KEY");
    if (geminiKey) headers["X-Gemini-API-Key"] = geminiKey;
    if (nvidiaKey) headers["X-Nvidia-API-Key"] = nvidiaKey;
  }
  return headers;
};

export async function triggerSimulation(scenarioType: string, customBriefing: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/simulate`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        ...getAuthHeaders()
      },
      body: JSON.stringify({ scenario_type: scenarioType, custom_briefing: customBriefing })
    });
    if (!res.ok) throw new Error("Simulation failed");
    return await res.json();
  } catch (e) {
    console.error("Simulation request failed", e);
    // Simulate a delayed response
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Customize mock response based on custom briefing if present
    const mockRiskResult = { ...MOCK_RUN_DETAILS.risk_agent.result };
    if (customBriefing) {
      mockRiskResult.key_threat_summary = `Parsed custom briefing: "${customBriefing}". Simulated threat indicators mapped to active shipping channels.`;
    }
    
    return {
      status: "success",
      run_id: `run_${Date.now()}_mock`,
      scenario: scenarioType,
      agent_steps: {
        risk_agent: { role: "Geopolitical Risk Analyst", result: mockRiskResult },
        scenario_modeller: { role: "Disruption Scenario Modeller", result: MOCK_RUN_DETAILS.scenario_modeller.result },
        procurement_orchestrator: { role: "Adaptive Procurement Orchestrator", result: MOCK_RUN_DETAILS.procurement_orchestrator.result },
        spr_optimisation_agent: { role: "SPR Inventory Manager", result: MOCK_RUN_DETAILS.spr_optimisation.result }
      },
      digital_twin_payload: MOCK_RUN_DETAILS.digital_twin.result
    };
  }
}

// RAG Briefings Client APIs
export const MOCK_BRIEFINGS = [
  { id: "doc_1", filename: "Hormuz_Transit_Protocol_2026.pdf", uploaded_at: "2026-06-23 10:14:02", file_size: 142050, chunks_count: 5 },
  { id: "doc_2", filename: "Strategic_Reserve_Drawdown_Rules.txt", uploaded_at: "2026-06-22 15:40:11", file_size: 4520, chunks_count: 1 }
];

export const MOCK_SEARCH_RESULTS = [
  { filename: "Hormuz_Transit_Protocol_2026.pdf", chunk_index: 0, text: "Under Article 4, all VLCCs transiting the Strait of Hormuz during elevated geopolitical alert levels must coordinate escort services with the Indian Navy to mitigate regional drone threats.", similarity: 0.89 },
  { filename: "Strategic_Reserve_Drawdown_Rules.txt", chunk_index: 0, text: "Strategic Petroleum Reserves (SPR) caverns Padur and Vizag are authorized for immediate emergency drawdowns if Middle East supplies drop by more than 20% over a 7-day rolling window.", similarity: 0.76 }
];

export async function getBriefings() {
  try {
    const res = await fetch(`${API_BASE_URL}/documents`, { cache: "no-store" });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn("Using mock briefings data");
    return MOCK_BRIEFINGS;
  }
}

export async function uploadBriefing(file: File) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      headers: {
        ...getAuthHeaders()
      },
      body: formData
    });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.error("Upload failed, using mock ingestion fallback", e);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      status: "success",
      doc_id: `doc_${Date.now()}_mock`,
      filename: file.name,
      chunks_count: Math.ceil(file.size / 1000) || 1
    };
  }
}

export async function deleteBriefing(docId: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${docId}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn(`Simulating successful deletion of doc: ${docId}`);
    return { status: "success" };
  }
}

export async function searchBriefings(query: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/search?query=${encodeURIComponent(query)}`, {
      headers: {
        ...getAuthHeaders()
      }
    });
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (e) {
    console.warn("Using mock search results");
    const term = query.toLowerCase();
    const hits = MOCK_SEARCH_RESULTS.filter(r => 
      r.text.toLowerCase().includes(term) || 
      r.filename.toLowerCase().includes(term)
    );
    return hits.length > 0 ? hits : MOCK_SEARCH_RESULTS;
  }
}
