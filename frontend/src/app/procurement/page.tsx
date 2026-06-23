"use client";

import { useSimulation } from "@/context/SimulationContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Compass, Leaf, ArrowRight, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";

export default function SourcingPage() {
  const { runData } = useSimulation();
  const [mounted, setMounted] = useState(false);
  const [activeRankTab, setActiveRankTab] = useState<"cost" | "esg">("cost");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract agent results
  const sourcingResult = runData?.procurement_orchestrator?.result ?? {
    cost_optimized_options: [
      { rank: 1, refinery_id: "BASELINE", supplier_id: "SUP_SAUDI", crude_grade: "Arab Light (Sour)", volume_barrels: 2000000, transit_time_days: 5, estimated_port_congestion_days: 1, crude_cost_usd_per_barrel: 73.00, total_cost_usd: 146000000, co2_emissions_metric_tons: 80, esg_score: 95, route_id: "RT_SAUDI_JAMNAGAR" }
    ],
    esg_optimized_options: [
      { rank: 1, refinery_id: "BASELINE", supplier_id: "SUP_SAUDI", crude_grade: "Arab Light (Sour)", volume_barrels: 2000000, transit_time_days: 5, estimated_port_congestion_days: 1, crude_cost_usd_per_barrel: 73.00, total_cost_usd: 146000000, co2_emissions_metric_tons: 80, esg_score: 95, route_id: "RT_SAUDI_JAMNAGAR" }
    ],
    ranking_methodology_comparison: "Currently operating on baseline contracts. No alternate supply sourcing has been active since there are no active corridor disruptions."
  };

  const activeOptions = activeRankTab === "cost" ? sourcingResult.cost_optimized_options : sourcingResult.esg_optimized_options;

  // Convert options to charting data representing CO2 emissions
  const emissionChartData = activeOptions.map((opt: any) => ({
    name: `${opt.supplier_id.replace("SUP_", "")}➔${opt.refinery_id.replace("REF_", "")}`,
    co2: opt.co2_emissions_metric_tons,
    cost: opt.total_cost_usd / 1000000
  }));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Adaptive Procurement & Sourcing</h1>
          <p className="text-slate-400 text-sm mt-1">Ranking alternative oil cargo routes, tanker classes, and carbon footprints</p>
        </div>

        {/* Tabs */}
        <div className="bg-slate-900 p-1 border border-slate-800 rounded-xl flex gap-1">
          <button
            onClick={() => setActiveRankTab("cost")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeRankTab === "cost"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <DollarSign size={14} />
            <span>Cost-Optimized</span>
          </button>
          <button
            onClick={() => setActiveRankTab("esg")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
              activeRankTab === "esg"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Leaf size={14} />
            <span>ESG-Optimized</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table comparison (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              {activeRankTab === "cost" ? "Cost-Optimized Cargo Rankings" : "ESG-Optimized Cargo Rankings"}
            </h3>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs uppercase bg-slate-950/40 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-center">Rank</th>
                    <th className="px-4 py-3 font-semibold">Refinery</th>
                    <th className="px-4 py-3 font-semibold">Alternative Supplier</th>
                    <th className="px-4 py-3 font-semibold">Grade</th>
                    <th className="px-4 py-3 font-semibold">Volume</th>
                    <th className="px-4 py-3 font-semibold text-center">Transit</th>
                    <th className="px-4 py-3 font-semibold text-center">Cost/Bbl</th>
                    <th className="px-4 py-3 font-semibold text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {activeOptions.map((opt: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-850/20">
                      <td className="px-4 py-4 text-center font-bold text-slate-200">#{opt.rank}</td>
                      <td className="px-4 py-4 font-mono font-bold text-slate-400">{opt.refinery_id}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                          <span>{opt.supplier_id.replace("SUP_", "")}</span>
                          <ArrowRight size={12} className="text-slate-500" />
                          <span className="text-[10px] text-slate-500 font-mono">({opt.route_id})</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs italic">{opt.crude_grade}</td>
                      <td className="px-4 py-4 text-xs font-semibold">{(opt.volume_barrels / 1000000).toFixed(1)}M Bbls</td>
                      <td className="px-4 py-4 text-center font-mono font-semibold text-slate-350">{opt.transit_time_days}d</td>
                      <td className="px-4 py-4 text-center font-mono text-emerald-400 font-semibold">${opt.crude_cost_usd_per_barrel}</td>
                      <td className="px-4 py-4 text-right font-mono font-bold text-slate-200">
                        ${(opt.total_cost_usd / 1000000).toFixed(1)}M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Emissions chart */}
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Carbon Surcharges (Metric Tons of CO2)</h3>
            <div className="h-[200px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={emissionChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", borderRadius: "8px" }} />
                    <Bar dataKey="co2" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: logistics details & agent thought (1/3 width) */}
        <div className="space-y-6">
          {/* Carbon/ESG Summary */}
          <div className="glass-panel glass-panel-hover p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Carbon Intensity Indexes</h3>
            <div className="space-y-3">
              {activeOptions.map((opt: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400">{opt.supplier_id.replace("SUP_", "")} Sourcing</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-500">ESG Score:</span>
                    <span className={`font-bold ${opt.esg_score > 80 ? "text-emerald-400" : "text-amber-400"}`}>
                      {opt.esg_score}/100
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sourcing methodology */}
          <div className="glass-panel glass-panel-hover p-6 rounded-3xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <Compass size={20} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Logistics Recommendation</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-medium bg-slate-950/40 border border-slate-800 p-4 rounded-2xl italic">
                "{sourcingResult.ranking_methodology_comparison}"
              </p>
            </div>
            
            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-4 mt-6">
              * Recommended by the Adaptive Procurement Orchestrator based on spot premiums and tanker availability.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
