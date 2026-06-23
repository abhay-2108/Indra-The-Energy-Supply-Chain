"use client";

import { useSimulation } from "@/context/SimulationContext";
import { History, FileText, Code, Database, ChevronRight, CornerDownRight } from "lucide-react";
import { useState } from "react";

export default function RunsPage() {
  const { historicalRuns, runData, loadHistoricalRun, isSimulating, activeRunId } = useSimulation();
  const [activeStepTab, setActiveStepTab] = useState<string>("risk_agent");

  const agentKeys = [
    { key: "risk_agent", label: "Geopolitical Risk Analyst" },
    { key: "scenario_modeller", label: "Scenario Modeller" },
    { key: "procurement_orchestrator", label: "Sourcing Director" },
    { key: "spr_optimisation_agent", label: "SPR Cavern Manager" }
  ];

  const currentRunDetails = runData?.agent_steps ?? null;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Simulation History & Audit Logs</h1>
        <p className="text-slate-400 text-sm mt-1">Audit historical multi-agent execution runs, LLM thoughts, and database queries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Directory of past runs (1/4 width) */}
        <div className="glass-panel p-5 rounded-3xl h-[600px] flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
            <History size={14} />
            <span>Execution Timeline</span>
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1.5">
            {historicalRuns.length > 0 ? (
              historicalRuns.map((run) => (
                <button
                  key={run.run_id}
                  onClick={() => loadHistoricalRun(run.run_id)}
                  disabled={isSimulating}
                  className={`w-full text-left p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-200 cursor-pointer disabled:cursor-not-allowed ${
                    activeRunId === run.run_id
                      ? "bg-emerald-500/10 border-emerald-500/25 text-slate-100"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-bold font-mono text-slate-500 uppercase">
                      {run.scenario_type.replace("_", " ")}
                    </span>
                    <ChevronRight size={12} className={activeRunId === run.run_id ? "text-emerald-400" : "text-slate-650"} />
                  </div>
                  <span className="text-xs font-bold font-mono tracking-tight text-slate-200 mt-2 truncate w-full">
                    {run.run_id.replace("run_", "")}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 mt-1">{run.timestamp}</span>
                </button>
              ))
            ) : (
              <div className="p-12 text-center text-slate-500 mt-12">
                <p className="text-xs font-semibold">No runs in database.</p>
                <p className="text-[10px] text-slate-600 mt-1">Execute a simulation from the control center to see history.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Multi-Agent detail view (3/4 width) */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-3xl h-[600px] flex flex-col">
          {currentRunDetails ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Agent Tabs */}
              <div className="border-b border-slate-800 flex gap-2 overflow-x-auto pb-3">
                {agentKeys.map((agent) => (
                  <button
                    key={agent.key}
                    onClick={() => setActiveStepTab(agent.key)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 shrink-0 cursor-pointer ${
                      activeStepTab === agent.key
                        ? "bg-slate-800 border-slate-700 text-slate-100"
                        : "bg-transparent border-transparent hover:bg-slate-800/20 text-slate-450 hover:text-slate-350"
                    }`}
                  >
                    {agent.label}
                  </button>
                ))}
              </div>

              {/* Agent Log Details */}
              <div className="flex-1 overflow-y-auto mt-6 space-y-6 pr-2">
                {/* Agent role header */}
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200">{currentRunDetails[activeStepTab]?.role}</h4>
                    <span className="text-[10px] text-slate-500 font-mono">DATABASE TABLE: {activeStepTab}_logs</span>
                  </div>
                </div>

                {/* Sub-sections: SQL Queries and Raw trace */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Database Tool Trace */}
                  <div className="glass-panel rounded-2xl p-5 flex flex-col h-[340px]">
                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                      <Database size={15} />
                      <span className="text-xs font-bold uppercase tracking-wider">Database Query Logs</span>
                    </div>
                    <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-[10px] text-emerald-400/90 leading-normal space-y-3">
                      <div className="text-slate-500">{"// Agent initialized database tool..."}</div>
                      <div className="flex gap-2">
                        <CornerDownRight size={12} className="text-slate-650 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-400">SELECT * FROM {activeStepTab === "risk_agent" ? "geopolitical_events_log" : activeStepTab === "scenario_modeller" ? "refineries" : activeStepTab === "procurement_orchestrator" ? "suppliers" : "spr_inventory"}</p>
                          <p className="text-slate-500 mt-1">{"=> Returning matching records..."}</p>
                        </div>
                      </div>
                      <div className="text-slate-600">{"// Handoff query executed successfully."}</div>
                    </div>
                  </div>

                  {/* Raw trace output */}
                  <div className="glass-panel rounded-2xl p-5 flex flex-col h-[340px]">
                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                      <Code size={15} />
                      <span className="text-xs font-bold uppercase tracking-wider">LLM Response JSON</span>
                    </div>
                    <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-[10px] text-slate-300 leading-normal whitespace-pre-wrap">
                      {JSON.stringify(currentRunDetails[activeStepTab]?.result, null, 2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3.5">
              <History size={36} className="text-slate-700" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-400">No Run Selected</p>
                <p className="text-xs text-slate-600 mt-1">Choose a historical execution run from the left directory panel to audit details.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
