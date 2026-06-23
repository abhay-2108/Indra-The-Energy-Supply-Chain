"use client";

import { useSimulation } from "@/context/SimulationContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { LineChart, Activity, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

export default function ScenarioPage() {
  const { runData } = useSimulation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract agent results
  const scenarioResult = runData?.scenario_modeller?.result ?? {
    simulated_scenario_name: "Baseline Operations",
    refinery_run_rates: {
      "REF_JAMNAGAR": { "normal_utilization": 98.0, "projected_utilization": 98.0, "barrel_drop": 0 },
      "REF_KOCHI": { "normal_utilization": 95.0, "projected_utilization": 95.0, "barrel_drop": 0 },
      "REF_PARADIP": { "normal_utilization": 96.0, "projected_utilization": 96.0, "barrel_drop": 0 }
    },
    refinery_days_to_stockout: { "REF_JAMNAGAR": 30, "REF_KOCHI": 30, "REF_PARADIP": 30 },
    domestic_fuel_price_impact: { "petrol_increase_inr_per_litre": 0.00, "diesel_increase_inr_per_litre": 0.00 },
    power_grid_stress: {
      "overall_stress_index": 1.2,
      "regional_blackout_probabilities": { "Western Grid": 2, "Southern Grid": 2, "Eastern Grid": 2 },
      "gwh_risk_estimate": 0
    },
    gdp_trajectory_drag_bps: 0,
    simulation_rationale: "Supply chain is operating within normal boundaries. Strategic reserves and commercial inventories are fully covered."
  };

  // Convert run rates to Recharts format
  const runRateData = Object.entries(scenarioResult.refinery_run_rates).map(([key, val]: any) => ({
    name: key.replace("REF_", ""),
    "Normal Run Rate": val.normal_utilization,
    "Projected Run Rate": val.projected_utilization
  }));

  const getDtsColor = (days: number) => {
    if (days <= 10) return "text-red-500 bg-red-500/10 border-red-500/20";
    if (days <= 20) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Disruption Scenario Modeller</h1>
        <p className="text-slate-400 text-sm mt-1">Simulating economic impacts on refineries, downstream pricing, and macro variables</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Run rates comparison (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Refinery Capacity Chart */}
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Refinery Run Rate Utilization (%)</h3>
            <div className="h-[250px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runRateData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" domain={[0, 100]} fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Normal Run Rate" fill="#1e293b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Projected Run Rate" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Refinery Days to Stockout */}
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Inventory Depletion Countdowns</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(scenarioResult.refinery_days_to_stockout).map(([id, days]: any) => (
                <div key={id} className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex flex-col justify-between h-[120px]">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{id.replace("REF_", "")} Storage Buffer</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black tracking-tight">{days}</span>
                    <span className="text-xs text-slate-400">days</span>
                  </div>
                  <span className={`text-[10px] font-bold text-center border py-1 rounded-md mt-2 ${getDtsColor(days)}`}>
                    {days <= 10 ? "CRITICAL STOCKOUT RISK" : days <= 20 ? "MODERATE PRESSURE" : "SECURE"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Downstream inflation & economist thought (1/3 width) */}
        <div className="space-y-6">
          {/* GDP Drag Card */}
          <div className="glass-panel glass-panel-hover p-6 rounded-3xl text-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">Projected GDP Impact</h3>
            <div className="mt-4 flex items-center justify-center gap-1.5">
              <LineChart size={20} className={scenarioResult.gdp_trajectory_drag_bps > 0 ? "text-red-500 animate-pulse" : "text-slate-500"} />
              <span className={`text-4xl font-black tracking-tight ${scenarioResult.gdp_trajectory_drag_bps > 0 ? "text-red-400" : "text-slate-300"}`}>
                {scenarioResult.gdp_trajectory_drag_bps > 0 ? `-${scenarioResult.gdp_trajectory_drag_bps}` : "0"}
              </span>
              <span className="text-xs text-slate-500 font-semibold uppercase">bps</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-2">Estimated quarterly GDP trajectory drag</p>
          </div>

          {/* Grid blackouts stress */}
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Downstream Power Grid Stress</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Overall Stress Index:</span>
                <span className="font-bold text-slate-200">{scenarioResult.power_grid_stress.overall_stress_index}/10</span>
              </div>
              <div className="space-y-2">
                {Object.entries(scenarioResult.power_grid_stress.regional_blackout_probabilities).map(([grid, prob]: any) => (
                  <div key={grid} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-450 uppercase">
                      <span>{grid}</span>
                      <span>Blackout Risk: {prob}%</span>
                    </div>
                    <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden border border-slate-800/80">
                      <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${prob}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Economist summary */}
          <div className="glass-panel glass-panel-hover p-6 rounded-3xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <Activity size={20} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Modeller Analysis</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-medium bg-slate-950/40 border border-slate-800 p-4 rounded-2xl italic">
                "{scenarioResult.simulation_rationale}"
              </p>
            </div>
            
            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-4 mt-6">
              * Simulated by the Disruption Scenario Modeller using dynamic supply elasticities.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
