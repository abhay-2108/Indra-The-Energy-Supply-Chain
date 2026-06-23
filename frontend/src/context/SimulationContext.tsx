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
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [runData, setRunData] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [historicalRuns, setHistoricalRuns] = useState<any[]>([]);

  const refreshRuns = async () => {
    try {
      const runs = await getRuns();
      setHistoricalRuns(runs);
    } catch (e) {
      console.error("Failed to load runs", e);
    }
  };

  // Load runs list on mount
  useEffect(() => {
    refreshRuns();
  }, []);

  const triggerNewRun = async (scenarioType: string, customBriefing?: string) => {
    setIsSimulating(true);
    try {
      console.log(`[Context] Triggering simulation for scenario: ${scenarioType}, briefing: ${customBriefing || "none"}`);
      const data = await triggerSimulation(scenarioType, customBriefing || "");
      if (data && data.status === "success") {
        setActiveRunId(data.run_id);
        setRunData(data.agent_steps ? data : null);
        await refreshRuns();
      }
    } catch (e) {
      console.error("Simulation trigger failed", e);
    } finally {
      setIsSimulating(false);
    }
  };

  const loadHistoricalRun = async (runId: string) => {
    setIsSimulating(true);
    try {
      console.log(`[Context] Loading historical run: ${runId}`);
      const details = await getRunDetails(runId);
      setActiveRunId(runId);
      setRunData(details);
    } catch (e) {
      console.error("Failed to load run details", e);
    } finally {
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
