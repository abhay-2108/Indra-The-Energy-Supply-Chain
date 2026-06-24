"use client";

import { useSimulation } from "@/context/SimulationContext";

export default function Header() {
  const { activeRunId, isSimulating } = useSimulation();

  return (
    <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-slate-950/90 backdrop-blur-md shrink-0 relative z-20 w-full">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-400">Security Control Hub</span>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
        <span className={`text-[11px] px-2 py-0.5 rounded-md font-mono border tracking-wider transition-all duration-300 ${
          isSimulating
            ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse font-bold"
            : activeRunId 
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]" 
              : "bg-slate-800/40 text-slate-400 border-slate-800"
        }`}>
          {isSimulating ? "RUNNING MULTI-AGENT CREW..." : activeRunId ? `RUN: ${activeRunId}` : "STATUS: BASELINE_NORMAL"}
        </span>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-slate-400">
          Simulated Timeline: <span className="text-emerald-400 font-mono">DAY 300</span>
        </div>
        <div className="text-xs text-slate-500 border border-white/5 rounded-lg px-2.5 py-1 bg-slate-950/40">
          LLM Context: <span className="text-slate-400 font-mono">Llama-3.1 (NVIDIA)</span>
        </div>
      </div>
    </header>
  );
}
