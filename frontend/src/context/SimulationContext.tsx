"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { triggerSimulation, getRunDetails, getRuns } from "@/lib/api";

interface SimulationContextType {
  activeRunId: string | null;
  runData: any | null;
  isSimulating: boolean;
  historicalRuns: any[];
  triggerNewRun: (scenarioType: string, customBriefing?: string) => Promise<void>;
  loadHistoricalRun: (runId: string) => Promise<void>;
  refreshRuns: () => Promise<void>;
  liveRunId: string | null;
  liveRunData: any | null;
  viewLiveRun: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const unifyRunData = (runId: string, steps: any, digitalTwinPayload: any, scenarioType?: string) => {
  return {
    run_id: runId,
    status: "success",
    scenario: scenarioType || steps.risk_agent?.scenario_type || null,
    
    // Root level keys (for risk, scenario, procurement, spr pages)
    risk_agent: steps.risk_agent || null,
    scenario_modeller: steps.scenario_modeller || null,
    procurement_orchestrator: steps.procurement_orchestrator || null,
    spr_optimisation: steps.spr_optimisation || steps.spr_optimisation_agent || null,
    digital_twin: steps.digital_twin || (digitalTwinPayload ? { result: digitalTwinPayload } : null),
    
    // Nested agent_steps key (for runs audit logs page)
    agent_steps: {
      risk_agent: steps.risk_agent ? { role: "Geopolitical Risk Analyst", ...steps.risk_agent } : null,
      scenario_modeller: steps.scenario_modeller ? { role: "Scenario Modeller", ...steps.scenario_modeller } : null,
      procurement_orchestrator: steps.procurement_orchestrator ? { role: "Sourcing Director", ...steps.procurement_orchestrator } : null,
      spr_optimisation_agent: (steps.spr_optimisation || steps.spr_optimisation_agent) ? { 
        role: "SPR Cavern Manager", 
        ...(steps.spr_optimisation || steps.spr_optimisation_agent) 
      } : null,
      digital_twin: (steps.digital_twin || digitalTwinPayload) ? { 
        role: "Digital Twin Compiler", 
        ...(steps.digital_twin || (digitalTwinPayload ? { result: digitalTwinPayload } : null))
      } : null
    },
    digital_twin_payload: digitalTwinPayload || steps.digital_twin?.result
  };
};

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runData, setRunData] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [historicalRuns, setHistoricalRuns] = useState<any[]>([]);
  const [liveRunId, setLiveRunId] = useState<string | null>(null);
  const [liveRunData, setLiveRunData] = useState<any | null>(null);

  const refreshRuns = async () => {
    try {
      const runs = await getRuns();
      setHistoricalRuns(runs);
    } catch (e) {
      console.error("Failed to load runs", e);
    }
  };

  const loadHistoricalRun = async (runId: string) => {
    try {
      console.log(`[Context] Loading historical run: ${runId}`);
      const details = await getRunDetails(runId);
      setActiveRunId(runId);
      
      const steps = {
        risk_agent: details?.risk_agent,
        scenario_modeller: details?.scenario_modeller,
        procurement_orchestrator: details?.procurement_orchestrator,
        spr_optimisation_agent: details?.spr_optimisation,
        digital_twin: details?.digital_twin
      };
      
      setRunData(unifyRunData(runId, steps, details?.digital_twin?.result, details?.risk_agent?.scenario_type));
    } catch (e) {
      console.error("Failed to load run details", e);
    }
  };

  // Load runs list on mount
  useEffect(() => {
    async function init() {
      try {
        const runs = await getRuns();
        setHistoricalRuns(runs);
        if (runs && runs.length > 0 && !activeRunId) {
          console.log(`[Context] Initializing with latest historical run: ${runs[0].run_id}`);
          await loadHistoricalRun(runs[0].run_id);
        }
      } catch (e) {
        console.error("Failed to load runs on mount", e);
      }
    }
    init();
  }, [activeRunId]);

  const viewLiveRun = () => {
    if (liveRunId && liveRunData) {
      setActiveRunId(liveRunId);
      setRunData(liveRunData);
    }
  };

  const triggerNewRun = async (scenarioType: string, customBriefing?: string) => {
    setIsSimulating(true);
    setRunData(null);
    setLiveRunData(null);
    setLiveRunId(null);
    try {
      console.log(`[Context] Triggering simulation for scenario: ${scenarioType}, briefing: ${customBriefing || "none"}`);
      const data = await triggerSimulation(scenarioType, customBriefing || "");
      
      if (data && data.status === "pending") {
        const runId = data.run_id;
        setActiveRunId(runId);
        setLiveRunId(runId);
        
        let currentSteps: any = {};
        let currentDigitalTwin: any = null;
        
        const initialUnified = unifyRunData(runId, currentSteps, currentDigitalTwin, scenarioType);
        setLiveRunData(initialUnified);
        setRunData(initialUnified);
        
        // Open WebSocket connection to FastAPI
        const isClient = typeof window !== 'undefined';
        const wsProtocol = isClient && window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsHost = isClient 
          ? (window.location.port === '3000'
              ? `${window.location.hostname}:8000`
              : window.location.host)
          : "127.0.0.1:8000";
        const wsUrl = `${wsProtocol}://${wsHost}/api/ws/run/${runId}`;
        const ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "agent_log") {
              console.log(`[WS Stream] Received log for agent: ${msg.agent}`);
              currentSteps[msg.agent] = {
                result: msg.result,
                timestamp: msg.timestamp,
                raw_output: msg.raw_output
              };
              if (msg.agent === "digital_twin") {
                currentDigitalTwin = msg.result;
              }
              
              const updatedUnified = unifyRunData(runId, currentSteps, currentDigitalTwin, scenarioType);
              setLiveRunData(updatedUnified);
              
              setActiveRunId((prev) => {
                if (prev === runId) {
                  setRunData(updatedUnified);
                }
                return prev;
              });
            } else if (msg.type === "complete") {
              console.log(`[WS Stream] Simulation complete for run ${runId}`);
              setIsSimulating(false);
              refreshRuns();
              ws.close();
            } else if (msg.type === "failed") {
              console.error(`[WS Stream] Simulation failed: ${msg.error}`);
              setIsSimulating(false);
              ws.close();
            }
          } catch (err) {
            console.error("Error parsing WebSocket message", err);
          }
        };
        
        ws.onclose = () => {
          setIsSimulating(false);
        };
        
        ws.onerror = (err) => {
          console.error("WebSocket connection error", err);
          setIsSimulating(false);
        };
        
      } else if (data && data.status === "success") {
        // Fallback for mock execution
        const runId = data.run_id;
        setActiveRunId(runId);
        setLiveRunId(runId);
        const steps = {
          risk_agent: data.agent_steps?.risk_agent,
          scenario_modeller: data.agent_steps?.scenario_modeller,
          procurement_orchestrator: data.agent_steps?.procurement_orchestrator,
          spr_optimisation_agent: data.agent_steps?.spr_optimisation_agent,
          digital_twin: data.digital_twin_payload ? { result: data.digital_twin_payload } : null
        };
        const unified = unifyRunData(runId, steps, data.digital_twin_payload, scenarioType);
        setLiveRunData(unified);
        setRunData(unified);
        setIsSimulating(false);
        await refreshRuns();
      }
    } catch (e) {
      console.error("Simulation trigger failed", e);
      setIsSimulating(false);
    }
  };



  return (
    <SimulationContext.Provider
      value={{
        activeRunId,
        runData,
        isSimulating,
        historicalRuns,
        triggerNewRun,
        loadHistoricalRun,
        refreshRuns,
        liveRunId,
        liveRunData,
        viewLiveRun,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
}
