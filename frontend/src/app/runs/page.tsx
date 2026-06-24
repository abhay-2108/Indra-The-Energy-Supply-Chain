"use client";

import { useSimulation } from "@/context/SimulationContext";
import { History, FileText, Code, Database, ChevronRight, CornerDownRight, Activity, Terminal } from "lucide-react";
import { useState, Fragment, useEffect } from "react";

export default function RunsPage() {
  const { 
    historicalRuns, 
    runData, 
    loadHistoricalRun, 
    isSimulating, 
    activeRunId,
    liveRunId,
    viewLiveRun 
  } = useSimulation();

  const [activeStepTab, setActiveStepTab] = useState<string>("risk_agent");

  const agentKeys = [
    { key: "risk_agent", label: "Geopolitical Risk Analyst" },
    { key: "scenario_modeller", label: "Scenario Modeller" },
    { key: "procurement_orchestrator", label: "Sourcing Director" },
    { key: "spr_optimisation_agent", label: "SPR Cavern Manager" },
    { key: "digital_twin", label: "Digital Twin Compiler" }
  ];

  const currentRunDetails = runData?.agent_steps ?? null;

  // Automatically select the active step if a live simulation is running
  useEffect(() => {
    if (activeRunId === liveRunId && currentRunDetails) {
      // Find the last completed or currently running agent to focus on
      const pipeline = ["risk_agent", "scenario_modeller", "procurement_orchestrator", "spr_optimisation_agent", "digital_twin"];
      let focusTab = "risk_agent";
      for (const step of pipeline) {
        if (currentRunDetails[step]) {
          focusTab = step;
        }
      }
      setActiveStepTab(focusTab);
    }
  }, [activeRunId, liveRunId, currentRunDetails]);

  // If a live simulation starts and we are on this page, view it automatically
  useEffect(() => {
    if (isSimulating && liveRunId && activeRunId !== liveRunId) {
      viewLiveRun();
    }
  }, [isSimulating, liveRunId]);

  const renderPipelineStatus = () => {
    const pipeline = [
      { key: "risk_agent", label: "Risk Analyst" },
      { key: "scenario_modeller", label: "Scenario Modeller" },
      { key: "procurement_orchestrator", label: "Sourcing Director" },
      { key: "spr_optimisation_agent", label: "SPR Cavern Manager" },
      { key: "digital_twin", label: "Digital Twin Compiler" }
    ];

    return (
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch justify-between gap-3 font-mono text-[10px]">
        {pipeline.map((step, idx) => {
          const isDone = currentRunDetails && currentRunDetails[step.key];
          const isCurrentLive = activeRunId === liveRunId && isSimulating;
          
          console.log("Visual stepper debug:", step.key, "isDone:", !!isDone, "currentRunDetails:", currentRunDetails);

          // An agent is active in live mode if it is not done and either it is step 1 or previous step is done
          const isActive = isCurrentLive && !isDone && (idx === 0 || currentRunDetails[pipeline[idx - 1].key]);
          const isSelected = activeStepTab === step.key;

          return (
            <Fragment key={step.key}>
              <button
                onClick={() => setActiveStepTab(step.key)}
                disabled={!isDone && !isActive}
                className={`flex-1 p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-200 text-left relative cursor-pointer disabled:cursor-not-allowed ${
                  isSelected
                    ? "bg-slate-800 border-slate-600 text-slate-100 ring-1 ring-emerald-500/30"
                    : isDone
                      ? "bg-emerald-950/20 border-emerald-900/30 hover:border-emerald-800 text-slate-300"
                      : isActive
                        ? "bg-indigo-950/20 border-indigo-900/30 text-indigo-300 animate-pulse"
                        : "bg-slate-950/30 border-slate-900/40 text-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[8px] tracking-wider uppercase opacity-60">Step {idx + 1}</span>
                  {isDone ? (
                    <span className="text-[8px] font-bold text-emerald-400">● Done</span>
                  ) : isActive ? (
                    <span className="text-[8px] font-bold text-indigo-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold text-slate-600">Standby</span>
                  )}
                </div>
                <div className="font-bold mt-2 text-[11px] truncate">{step.label}</div>
              </button>
              {idx < pipeline.length - 1 && (
                <div className="hidden md:flex items-center text-slate-800 select-none px-1">➔</div>
              )}
            </Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">Simulation History & Audit Logs</h1>
        <p className="text-slate-400 text-sm mt-1">Audit historical multi-agent execution runs, LLM thoughts, and database queries</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Timeline of runs */}
        <div className="glass-panel p-5 rounded-3xl h-[660px] flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
            <History size={14} />
            <span>Execution Timeline</span>
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1.5">
            {/* Live Run Timeline Item */}
            {(isSimulating || liveRunId) && (
              <button
                onClick={() => viewLiveRun()}
                className={`w-full text-left p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-200 cursor-pointer ${
                  activeRunId === liveRunId
                    ? "bg-indigo-500/10 border-indigo-500/25 text-slate-100"
                    : "bg-slate-950/40 border-indigo-900/10 hover:border-indigo-850 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[9px] font-bold font-mono text-indigo-400 uppercase flex items-center gap-1.5">
                    {isSimulating ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                        <span>LIVE EXECUTION</span>
                      </>
                    ) : (
                      <span>LATEST RUN DETAILS</span>
                    )}
                  </span>
                  <ChevronRight size={12} className={activeRunId === liveRunId ? "text-indigo-400" : "text-slate-600"} />
                </div>
                <span className="text-xs font-bold font-mono tracking-tight text-slate-200 mt-2 truncate w-full">
                  {liveRunId?.replace("run_", "") ?? "Loading..."}
                </span>
                <span className="text-[9px] font-mono text-slate-500 mt-1">
                  {isSimulating ? "Streaming logs real-time..." : "Finished live run"}
                </span>
              </button>
            )}

            {historicalRuns.length > 0 ? (
              historicalRuns.map((run) => (
                <button
                  key={run.run_id}
                  onClick={() => loadHistoricalRun(run.run_id)}
                  disabled={isSimulating && run.run_id === liveRunId}
                  className={`w-full text-left p-3.5 rounded-xl border flex flex-col justify-between transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    activeRunId === run.run_id && activeRunId !== liveRunId
                      ? "bg-emerald-500/10 border-emerald-500/25 text-slate-100"
                      : "bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-400"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-bold font-mono text-slate-500 uppercase">
                      {run.scenario_type.replace("_", " ")}
                    </span>
                    <ChevronRight size={12} className={activeRunId === run.run_id && activeRunId !== liveRunId ? "text-emerald-400" : "text-slate-650"} />
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

        {/* Right column: Multi-Agent detail view */}
        <div className="lg:col-span-3 glass-panel p-6 rounded-3xl h-[660px] flex flex-col">
          {currentRunDetails ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Agent execution horizontal pipeline status */}
              {renderPipelineStatus()}

              {/* Agent Tabs */}
              <div className="border-b border-slate-800 flex gap-2 overflow-x-auto pb-3">
                {agentKeys.map((agent) => {
                  const hasData = currentRunDetails[agent.key];
                  const isCurrentLive = activeRunId === liveRunId && isSimulating;
                  const isActive = isCurrentLive && !hasData && (agentKeys.findIndex(a => a.key === agent.key) === 0 || currentRunDetails[agentKeys[agentKeys.findIndex(a => a.key === agent.key) - 1].key]);

                  return (
                    <button
                      key={agent.key}
                      onClick={() => setActiveStepTab(agent.key)}
                      disabled={!hasData && !isActive}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        activeStepTab === agent.key
                          ? "bg-slate-800 border-slate-700 text-slate-100"
                          : "bg-transparent border-transparent hover:bg-slate-800/20 text-slate-450 hover:text-slate-350"
                      }`}
                    >
                      {agent.label}
                    </button>
                  );
                })}
              </div>

              {/* Agent Log Details */}
              <div className="flex-1 overflow-y-auto mt-6 space-y-6 pr-2">
                {/* Agent role header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-emerald-400 rounded-xl">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-200">{currentRunDetails[activeStepTab]?.role ?? "Connecting..."}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">DATABASE TABLE: {activeStepTab.replace("_agent", "")}_logs</span>
                    </div>
                  </div>

                  {activeRunId === liveRunId && isSimulating && !currentRunDetails[activeStepTab] && (
                    <span className="text-[10px] font-bold font-mono text-indigo-400 bg-indigo-950/30 border border-indigo-900/30 px-2.5 py-1 rounded-md animate-pulse">
                      Waiting for stream...
                    </span>
                  )}
                </div>

                {/* Agent details columns */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  {/* Database Tool Trace */}
                  <div className="glass-panel rounded-2xl p-5 flex flex-col h-[380px]">
                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                      <Database size={15} />
                      <span className="text-xs font-bold uppercase tracking-wider">Database Query Logs</span>
                    </div>
                    <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-[10px] text-emerald-400/90 leading-normal space-y-3">
                      <div className="text-slate-500">{"// Agent initialized database tool..."}</div>
                      <div className="flex gap-2">
                        <CornerDownRight size={12} className="text-slate-650 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-slate-400">
                            {activeStepTab === "risk_agent" && "SELECT * FROM geopolitical_events_log ORDER BY date DESC LIMIT 20;"}
                            {activeStepTab === "scenario_modeller" && "SELECT * FROM refineries; SELECT * FROM historical_market_prices ORDER BY date DESC;"}
                            {activeStepTab === "procurement_orchestrator" && "SELECT * FROM suppliers; SELECT * FROM routes;"}
                            {activeStepTab === "spr_optimisation_agent" && "SELECT * FROM spr_inventory; SELECT * FROM refineries;"}
                            {activeStepTab === "digital_twin" && "SELECT * FROM active_shipments; SELECT * FROM routes; SELECT * FROM spr_inventory;"}
                          </p>
                          <p className="text-slate-500 mt-1">{"=> Query executed successfully."}</p>
                        </div>
                      </div>
                      <div className="text-slate-600">{"// Handoff query logs loaded."}</div>
                    </div>
                  </div>

                  {/* Chain of thought thoughts */}
                  <div className="glass-panel rounded-2xl p-5 flex flex-col h-[380px]">
                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                      <Terminal size={15} />
                      <span className="text-xs font-bold uppercase tracking-wider">Agent Chain of Thought</span>
                    </div>
                    <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-[10px] text-emerald-300 leading-normal whitespace-pre-wrap">
                      {currentRunDetails[activeStepTab]?.raw_output ? (
                        currentRunDetails[activeStepTab].raw_output
                      ) : (
                        <div className="text-slate-600 italic mt-2">
                          {activeRunId === liveRunId && isSimulating && !currentRunDetails[activeStepTab]
                            ? "Agent execution in queue. Waiting for prior agents to handoff state..."
                            : "Running on high-fidelity simulation baseline. No raw LLM trace log generated."}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compiled JSON output */}
                  <div className="glass-panel rounded-2xl p-5 flex flex-col h-[380px]">
                    <div className="flex items-center gap-2 text-slate-400 mb-3">
                      <Code size={15} />
                      <span className="text-xs font-bold uppercase tracking-wider">LLM Response JSON</span>
                    </div>
                    <div className="flex-1 bg-slate-950 border border-slate-900 rounded-xl p-4 overflow-y-auto font-mono text-[10px] text-slate-300 leading-normal whitespace-pre-wrap">
                      {currentRunDetails[activeStepTab]?.result ? (
                        JSON.stringify(currentRunDetails[activeStepTab].result, null, 2)
                      ) : (
                        <div className="text-slate-600 italic mt-2">
                          {activeRunId === liveRunId && isSimulating && !currentRunDetails[activeStepTab]
                            ? "Awaiting parsed JSON payload from WebSocket..."
                            : "No parsed payload available."}
                        </div>
                      )}
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
