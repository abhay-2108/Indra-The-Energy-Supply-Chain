"use client";

import { useSimulation } from "@/context/SimulationContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Database, LineChart, Shield, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export default function SprPage() {
  const { runData } = useSimulation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract agent results
  const sprResult = runData?.spr_optimisation?.result ?? {
    drawdown_schedule: [],
    replenishment_window_days: 0,
    spr_depletion_forecast: {
      "SPR_PADUR": { "pre_event_barrels": 18300000, "post_event_barrels": 18300000, "percent_depleted": 0.0 },
      "SPR_MANGALURU": { "pre_event_barrels": 11000000, "post_event_barrels": 11000000, "percent_depleted": 0.0 },
      "SPR_VIZAG": { "pre_event_barrels": 9700000, "post_event_barrels": 9700000, "percent_depleted": 0.0 }
    },
    post_crisis_days_of_cover: 9.5,
    financial_metrics: {
      "operational_drawdown_cost_usd": 0,
      "estimated_refill_cost_usd": 0,
      "refill_price_strategy": "Reserves are fully stocked at 100% capacity. No replenishment strategies active."
    },
    policymaker_recommendation_summary: "Reserves are operating in standard standby mode. No drawdown releases required."
  };

  // Convert forecast to Recharts format
  const chartData = Object.entries(sprResult.spr_depletion_forecast).map(([key, val]: any) => ({
    name: key.replace("SPR_", ""),
    "Pre-disruption": val.pre_event_barrels / 1000000,
    "Post-disruption": val.post_event_barrels / 1000000
  }));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Strategic Reserves Drawdown Control</h1>
        <p className="text-slate-400 text-sm mt-1">Managing emergency crude stock releases, cavern inventories, and replenishment timelines</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Depletion forecasts (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cavern Capacities Chart */}
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Cavern Inventory Depletion Forecast (Million Barrels)</h3>
            <div className="h-[250px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", borderRadius: "8px" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                    <Bar dataKey="Pre-disruption" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Post-disruption" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Drawdown Allocations */}
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Active Emergency Release Schedules</h3>
            <div className="overflow-x-auto mt-4">
              {sprResult.drawdown_schedule.length > 0 ? (
                <table className="w-full text-sm text-left text-slate-400">
                  <thead className="text-xs uppercase bg-slate-950/40 text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Source Cavern</th>
                      <th className="px-6 py-3 font-semibold">Refinery Destination</th>
                      <th className="px-6 py-3 font-semibold text-center">Daily Release (bpd)</th>
                      <th className="px-6 py-3 font-semibold text-center">Duration</th>
                      <th className="px-6 py-3 font-semibold text-right">Total Allocated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sprResult.drawdown_schedule.map((alloc: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-850/20">
                        <td className="px-6 py-4 font-mono font-bold text-slate-200">{alloc.spr_id}</td>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-400">{alloc.refinery_id}</td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-emerald-400">
                          {(alloc.drawdown_rate_bpd / 1000).toFixed(0)}k bpd
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-slate-350">{alloc.duration_days} days</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-slate-200">
                          {(alloc.total_allocated_barrels / 1000).toFixed(0)}k Barrels
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <Database size={24} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-xs font-semibold">No active drawdown drawdowns are scheduled.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: economics & advisor summary (1/3 width) */}
        <div className="space-y-6">
          {/* Pumping Costs */}
          <div className="glass-panel glass-panel-hover p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Pumping & Refill Costs</h3>
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Pumping Operational Cost:</span>
                <span className="font-mono font-bold text-slate-250">
                  ${(sprResult.financial_metrics.operational_drawdown_cost_usd / 1000).toFixed(0)}k USD
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Est. Replenishment Cost:</span>
                <span className="font-mono font-bold text-red-400">
                  ${(sprResult.financial_metrics.estimated_refill_cost_usd / 1000000).toFixed(1)}M USD
                </span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-3">
                <span className="text-slate-500">Refill Pricing Curve:</span>
                <div className="flex items-center gap-1 text-[10px] bg-slate-950/40 px-2 py-0.5 border border-slate-800 rounded font-bold text-slate-400 font-mono">
                  <RefreshCw size={10} className="animate-spin" />
                  <span>BACKWARDATION</span>
                </div>
              </div>
            </div>
          </div>

          {/* Policymaker summary */}
          <div className="glass-panel glass-panel-hover p-6 rounded-3xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <Shield size={20} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Policy Recommendations</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-medium bg-slate-950/40 border border-slate-800 p-4 rounded-2xl italic">
                "{sprResult.policymaker_recommendation_summary}"
              </p>
            </div>
            
            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-4 mt-6">
              * Quantified by the Strategic Reserve Optimisation Agent for national energy security coordination.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
