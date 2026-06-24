"use client";

export const dynamic = "force-dynamic";

import { useSimulation } from "@/context/SimulationContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ShieldAlert, TrendingUp, HelpCircle } from "lucide-react";
import { useState, useEffect } from "react";

export default function RiskPage() {
  const { runData, isSimulating } = useSimulation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Extract agent results
  const riskResult = runData?.risk_agent?.result ?? {
    disruption_probability_by_corridor: { "Strait of Hormuz": 0.05, "Red Sea": 0.05, "Cape of Good Hope": 0.01 },
    disruption_probability_by_supplier: { "SUP_SAUDI": 0.02, "SUP_IRAQ": 0.02, "SUP_US_GULF": 0.01, "SUP_NIGERIA": 0.01 },
    risk_trend: "STABLE",
    hedging_trigger: false,
    sanctions_status: { "SUP_SAUDI": "NONE", "SUP_IRAQ": "NONE", "SUP_US_GULF": "NONE" },
    market_price_signals: { "price_escalation": "NORMAL" },
    key_threat_summary: "Baseline security levels detected across all corridors. Shipping lanes are operating normally with standard insurance premiums. No active chokepoint obstructions reported."
  };

  // Convert corridors dict to array for Recharts
  const corridorData = Object.entries(riskResult.disruption_probability_by_corridor).map(([key, val]) => ({
    name: key,
    probability: Number(val) * 100
  }));

  const getSeverityColor = (score: number) => {
    if (score > 70) return "#ef4444"; // Red
    if (score > 40) return "#f59e0b"; // Amber
    return "#10b981"; // Emerald
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Geopolitical Threat Intelligence Monitor</h1>
        <p className="text-slate-400 text-sm mt-1">Quantifying global shipping lane closures, sanctions risks, and market stress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Probability graph (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Chokepoint Disruption Probabilities</h3>
            <div className="h-[250px] w-full mt-4">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={corridorData} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} unit="%" />
                    <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={120} />
                    <Tooltip 
                      cursor={{ fill: "#1e293b", opacity: 0.3 }}
                      contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                      itemStyle={{ color: "#f8fafc" }}
                      labelStyle={{ color: "#94a3b8", fontWeight: "bold" }}
                    />
                    <Bar dataKey="probability" radius={[0, 4, 4, 0]} barSize={24}>
                      {corridorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getSeverityColor(entry.probability)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Supplier Risk & Sanctions Log */}
          <div className="glass-panel p-6 rounded-3xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Supplier Risk Assessment</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs uppercase bg-slate-950/40 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Supplier ID</th>
                    <th className="px-6 py-3 font-semibold">Disruption Probability</th>
                    <th className="px-6 py-3 font-semibold">Sanctions Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.entries(riskResult.disruption_probability_by_supplier).map(([id, prob]: any) => (
                    <tr key={id} className="hover:bg-slate-850/20">
                      <td className="px-6 py-4 font-mono font-bold text-slate-200">{id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-850 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${prob * 100}%`, backgroundColor: getSeverityColor(prob * 100) }}
                            />
                          </div>
                          <span className="font-bold text-xs" style={{ color: getSeverityColor(prob * 100) }}>
                            {(prob * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                          riskResult.sanctions_status[id] === "CRITICAL"
                            ? "bg-red-500/10 text-red-400 border border-red-950/30"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          {riskResult.sanctions_status[id] ?? "NONE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: LLM Output Analysis (1/3 width) */}
        <div className="space-y-6">
          {/* Risk Trend & Hedging Trigger */}
          <div className="glass-panel glass-panel-hover p-6 rounded-3xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Risk Severity Status</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Trend */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Risk Trend</p>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <TrendingUp size={16} className={riskResult.risk_trend === "CRITICAL" ? "text-red-500 animate-bounce" : "text-slate-500"} />
                  <span className={`font-black text-sm ${
                    riskResult.risk_trend === "CRITICAL" 
                      ? "text-red-400" 
                      : riskResult.risk_trend === "ELEVATING"
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}>
                    {riskResult.risk_trend}
                  </span>
                </div>
              </div>

              {/* Hedging trigger */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hedging Alert</p>
                <p className={`font-black text-sm mt-2 ${riskResult.hedging_trigger ? "text-red-400 animate-pulse" : "text-slate-500"}`}>
                  {riskResult.hedging_trigger ? "TRIGGERED" : "NORMAL"}
                </p>
              </div>
            </div>
          </div>

          {/* Risk Summary Card */}
          <div className="glass-panel glass-panel-hover p-6 rounded-3xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <ShieldAlert size={20} />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">Risk Analyst Reasoning</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-medium bg-slate-950/40 border border-slate-800 p-4 rounded-2xl italic">
                "{riskResult.key_threat_summary}"
              </p>
            </div>
            
            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-4 mt-6">
              * Quantified by the Geopolitical Risk Intelligence Agent using news feeds and active shipping lanes.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
