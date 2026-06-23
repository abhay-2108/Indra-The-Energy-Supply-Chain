"use client";

import dynamic from "next/dynamic";
import { useSimulation } from "@/context/SimulationContext";
import { useState, useEffect } from "react";
import { getEvents } from "@/lib/api";
import { 
  ShieldAlert, 
  Activity, 
  DollarSign, 
  Flame, 
  AlertTriangle,
  Play,
  RotateCcw
} from "lucide-react";

// Dynamically import Leaflet Map to prevent Next.js SSR window errors
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function DashboardPage() {
  const { runData, isSimulating, triggerNewRun, activeRunId } = useSimulation();
  const [events, setEvents] = useState<any[]>([]);
  const [briefingText, setBriefingText] = useState("");

  const handleCustomSimulation = () => {
    if (!briefingText.trim()) return;
    triggerNewRun("custom_scenario", briefingText);
  };

  const handleQuickExample = (text: string) => {
    setBriefingText(text);
  };

  useEffect(() => {
    async function loadEvents() {
      const data = await getEvents();
      setEvents(data);
    }
    loadEvents();
  }, [activeRunId]);

  // Extract KPI values
  const kpis = runData?.digital_twin?.result?.scenario_comparison?.baseline_vs_disrupted_kpis ?? {
    total_sourcing_cost_delta_usd: 0,
    national_days_of_cover: 9.5,
    fuel_price_delta_inr: 0.00,
    co2_footprint_delta_tons: 0
  };

  const isDisrupted = runData?.digital_twin?.result?.scenario_comparison?.is_disrupted ?? false;
  const singlePointsOfFailure = runData?.digital_twin?.result?.scenario_comparison?.single_points_of_failure ?? [];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">National Energy Command Center</h1>
          <p className="text-slate-400 text-sm mt-1">Geospatial Digital Twin & Multi-Agent Operations Console</p>
        </div>
        
        {/* Scenario Launcher */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => triggerNewRun("hormuz_closure")}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-red-600/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <Play size={15} />
            <span>Simulate Hormuz Closure</span>
          </button>
          <button
            onClick={() => triggerNewRun("red_sea_threat")}
            disabled={isSimulating}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-amber-600/10 cursor-pointer disabled:cursor-not-allowed"
          >
            <Play size={15} />
            <span>Simulate Red Sea Crisis</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Cost Delta */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Sourcing Cost Delta</span>
            <DollarSign size={18} className="text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">
              {kpis.total_sourcing_cost_delta_usd > 0 
                ? `+$${(kpis.total_sourcing_cost_delta_usd / 1000000).toFixed(1)}M` 
                : "$0.0M"}
            </span>
            <span className="text-xs text-slate-500">USD Premium</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            {kpis.total_sourcing_cost_delta_usd > 0 ? "Alternative spot purchases active" : "Operating on baseline contracts"}
          </div>
        </div>

        {/* Strategic Petroleum Cover */}
        <div className="glass-panel glass-panel-hover-indigo rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Strategic Stockpile Cover</span>
            <Activity size={18} className="text-violet-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">{kpis.national_days_of_cover}</span>
            <span className="text-xs text-slate-400 font-semibold">Days</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-2">
            National consumption buffer remaining
          </div>
        </div>

        {/* Domestic Retail Price delta */}
        <div className="glass-panel glass-panel-hover-amber rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Fuel Price Delta</span>
            <Flame size={18} className="text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">
              {kpis.fuel_price_delta_inr > 0 ? `+₹${kpis.fuel_price_delta_inr.toFixed(2)}` : "₹0.00"}
            </span>
            <span className="text-xs text-slate-500">per Litre</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Projected average retail inflation
          </div>
        </div>

        {/* Carbon Footprint */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Logistics CO2 Offset</span>
            <ShieldAlert size={18} className="text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight">
              {kpis.co2_footprint_delta_tons > 0 ? `+${kpis.co2_footprint_delta_tons}t` : "0t"}
            </span>
            <span className="text-xs text-slate-500">CO2 Emissions</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Emissions surcharge due to Cape route diversion
          </div>
        </div>
      </div>

      {/* Dynamic Intel Briefing Injector */}
      <div className="glass-panel glass-panel-hover rounded-3xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5 max-w-md">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-405 text-emerald-400 flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" />
              <span>Interactive Geopolitical Intel Injector (RAG)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Type any custom maritime threat, port strike, or sanction brief. The Geopolitical Risk Agent will parse this text dynamically to calculate corridor disruption parameters.
            </p>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
            <textarea
              value={briefingText}
              onChange={(e) => setBriefingText(e.target.value)}
              placeholder="e.g. Armed drone attacks near Strait of Hormuz block all departing oil tankers..."
              disabled={isSimulating}
              className="flex-1 bg-slate-950/65 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none h-14"
            />
            <button
              onClick={handleCustomSimulation}
              disabled={isSimulating || !briefingText.trim()}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-transparent text-white border border-emerald-500/20 rounded-xl text-xs font-bold transition-all duration-200 shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <Play size={14} />
              <span>Execute Intel Simulation</span>
            </button>
          </div>
        </div>

        {/* Quick Example Suggestions */}
        <div className="flex items-center gap-2.5 mt-4 text-[10px] text-slate-500 relative z-10">
          <span className="font-semibold uppercase tracking-wider text-slate-600">Quick Scenarios:</span>
          <button
            onClick={() => handleQuickExample("Maritime strike at Strait of Hormuz halts Saudi and Iraqi crude exports.")}
            disabled={isSimulating}
            className="hover:text-slate-300 border border-slate-850 hover:border-slate-700 px-2 py-1 rounded bg-slate-950/40 transition-all cursor-pointer"
          >
            Hormuz Strike
          </button>
          <button
            onClick={() => handleQuickExample("Red Sea Houthi attacks block all cargo transit via Bab-el-Mandeb.")}
            disabled={isSimulating}
            className="hover:text-slate-300 border border-slate-850 hover:border-slate-700 px-2 py-1 rounded bg-slate-950/40 transition-all cursor-pointer"
          >
            Red Sea Blockade
          </button>
          <button
            onClick={() => handleQuickExample("Visakhapatnam SPR strategic cavern terminal shuts down due to local pipeline leakage.")}
            disabled={isSimulating}
            className="hover:text-slate-300 border border-slate-850 hover:border-slate-700 px-2 py-1 rounded bg-slate-950/40 transition-all cursor-pointer"
          >
            Vizag SPR Leak
          </button>
        </div>
      </div>

      {/* Main Grid: Map & News Alert ticker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map visualizer (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-3xl p-4 relative">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-sm font-semibold text-slate-300">Live Infrastructure & Tanker Feed</span>
              <span className="text-xs text-slate-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Digital Twin Active
              </span>
            </div>
            {isSimulating ? (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center rounded-3xl space-y-4">
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <span className="absolute w-full h-full rounded-full border-4 border-emerald-500/20 animate-ping"></span>
                  <span className="absolute w-12 h-12 rounded-full border-4 border-emerald-500/40 animate-pulse"></span>
                  <div className="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-slate-300 font-bold text-sm tracking-wider uppercase">Running multi-agent analysis...</p>
                <p className="text-xs text-slate-500 max-w-sm text-center">Quantifying chokepoints threats, recalculating refinery run-rates, optimizing Strategic Reserves drawdowns, and drawing alternate shipping geometries...</p>
              </div>
            ) : null}
            <Map />
          </div>
        </div>

        {/* Right side: Alert feeds & SPOFs */}
        <div className="space-y-6">
          {/* Geopolitical Intelligence Alert log */}
          <div className="glass-panel p-6 rounded-3xl h-[280px] flex flex-col">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Geopolitical Intel Alerts</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {events.map((evt: any) => (
                <div 
                  key={evt.id} 
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                    evt.severity_score > 0.7 
                      ? "bg-red-500/5 border-red-500/10 text-slate-300" 
                      : evt.severity_score > 0.4
                        ? "bg-amber-500/5 border-amber-500/10 text-slate-300"
                        : "bg-slate-850 border-slate-800 text-slate-400"
                  }`}
                >
                  <AlertTriangle 
                    size={16} 
                    className={`mt-0.5 shrink-0 ${
                      evt.severity_score > 0.7 
                        ? "text-red-500" 
                        : evt.severity_score > 0.4
                          ? "text-amber-500"
                          : "text-slate-500"
                    }`} 
                  />
                  <div>
                    <p className="text-xs font-semibold leading-relaxed">{evt.event_description}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500 font-mono">
                      <span>{evt.date}</span>
                      <span>•</span>
                      <span>{evt.region}</span>
                      <span>•</span>
                      <span className="font-bold text-slate-400">Severity: {evt.severity_score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SPOFs & Risk Alerts */}
          <div className="glass-panel glass-panel-hover-red p-6 rounded-3xl h-[246px] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Vulnerability Assessment</h3>
              {isDisrupted ? (
                <div className="space-y-4">
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex items-start gap-2.5">
                    <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="font-bold">CRITICAL SUPPLY CHAIN BOTTLENECK</p>
                      <p className="mt-1 opacity-90">Strait of Hormuz is closed. Baseline shipping lanes from the Persian Gulf have been blocked.</p>
                    </div>
                  </div>
                  
                  {/* List of SPOFs */}
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">Single Points of Failure (SPOFs)</p>
                    <div className="flex flex-wrap gap-2">
                      {singlePointsOfFailure.map((node: string, idx: number) => (
                        <span key={idx} className="text-[10px] font-bold font-mono bg-red-950/40 text-red-400 border border-red-900/30 px-2.5 py-1 rounded-md">
                          {node}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500">
                  <Activity size={24} className="mx-auto mb-2 text-slate-600" />
                  <p className="text-xs font-semibold">All shipping corridors functioning under SAFE baseline limits.</p>
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-slate-500 border-t border-slate-800 pt-3">
              * What-if analysis re-runs continuously based on events feed inputs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
