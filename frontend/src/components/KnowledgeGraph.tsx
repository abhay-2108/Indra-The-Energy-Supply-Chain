"use client";

import React, { useState } from "react";
import { useSimulation } from "@/context/SimulationContext";
import { Building2, Database, Globe, Compass, ShieldAlert, ArrowRight, Activity } from "lucide-react";

interface NodeProps {
  id: string;
  name: string;
  type: "supplier" | "chokepoint" | "shipment" | "refinery" | "spr";
  status: "safe" | "blocked" | "delayed" | "stressed" | "drawdown" | "alternative" | "normal";
  statusLabel: string;
  left: string;
  top: string;
  valueLabel?: string;
  activeFlows: string[];
  hoveredFlow: string | null;
  setHoveredFlow: (flow: string | null) => void;
}

function GraphNode({
  id,
  name,
  type,
  status,
  statusLabel,
  left,
  top,
  valueLabel,
  activeFlows,
  hoveredFlow,
  setHoveredFlow,
}: NodeProps) {
  // Determine if this node is active in the hovered flow path
  const isHighlighted = hoveredFlow ? activeFlows.includes(hoveredFlow) : false;
  const isDimmed = hoveredFlow ? !isHighlighted : false;

  // Determine borders and glows based on simulation status
  let borderClass = "border-slate-800";
  let textGlow = "text-slate-400";
  let statusDot = "bg-slate-500";
  let glowClass = "";

  if (status === "blocked") {
    borderClass = "border-red-500/50 bg-red-950/20";
    textGlow = "text-red-400";
    statusDot = "bg-red-500 animate-ping";
    glowClass = "shadow-[0_0_15px_rgba(239,68,68,0.15)]";
  } else if (status === "delayed") {
    borderClass = "border-amber-500/40 bg-amber-950/15";
    textGlow = "text-amber-400";
    statusDot = "bg-amber-500 animate-pulse";
    glowClass = "shadow-[0_0_12px_rgba(245,158,11,0.1)]";
  } else if (status === "stressed") {
    borderClass = "border-orange-500/50 bg-orange-950/20";
    textGlow = "text-orange-400";
    statusDot = "bg-orange-500 animate-pulse";
    glowClass = "shadow-[0_0_15px_rgba(249,115,22,0.15)] animate-pulse";
  } else if (status === "drawdown") {
    borderClass = "border-emerald-500/50 bg-emerald-950/20";
    textGlow = "text-emerald-400";
    statusDot = "bg-emerald-400 animate-ping";
    glowClass = "shadow-[0_0_15px_rgba(16,185,129,0.15)]";
  } else if (status === "alternative") {
    borderClass = "border-sky-500/40 bg-sky-950/15";
    textGlow = "text-sky-400";
    statusDot = "bg-sky-400";
    glowClass = "shadow-[0_0_12px_rgba(56,189,248,0.1)]";
  } else if (status === "safe" || status === "normal") {
    borderClass = "border-slate-800 bg-slate-900/60";
    textGlow = "text-slate-200";
    statusDot = "bg-emerald-500";
  }

  // Icons selection
  const getIcon = () => {
    switch (type) {
      case "supplier":
        return <Globe size={13} className={textGlow} />;
      case "chokepoint":
        return <Compass size={13} className={textGlow} />;
      case "shipment":
        return <Activity size={13} className={textGlow} />;
      case "refinery":
        return <Building2 size={13} className={textGlow} />;
      case "spr":
        return <Database size={13} className={textGlow} />;
    }
  };

  return (
    <div
      style={{ left, top }}
      className={`absolute w-36 glass-panel ${borderClass} ${glowClass} rounded-xl p-2.5 z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 cursor-pointer ${
        isHighlighted ? "scale-105 border-emerald-400/60 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]" : ""
      } ${isDimmed ? "opacity-30" : "opacity-100"}`}
      onMouseEnter={() => {
        // Highlight primary active flow when hovered
        if (activeFlows.length > 0) {
          setHoveredFlow(activeFlows[0]);
        }
      }}
      onMouseLeave={() => setHoveredFlow(null)}
    >
      <div className="flex items-center justify-between gap-1.5 border-b border-white/5 pb-1 mb-1.5">
        <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase font-mono truncate">{id}</span>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`}></span>
          <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{statusLabel}</span>
        </div>
      </div>

      <div className="flex items-start gap-1.5">
        <div className="mt-0.5 shrink-0">{getIcon()}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold text-slate-200 leading-tight truncate" title={name}>
            {name}
          </p>
          {valueLabel && <p className="text-[8px] font-mono text-slate-450 mt-0.5">{valueLabel}</p>}
        </div>
      </div>
    </div>
  );
}

export default function KnowledgeGraph() {
  const { runData } = useSimulation();
  const [hoveredFlow, setHoveredFlow] = useState<string | null>(null);

  // Check active simulation status
  const isDisrupted = runData?.digital_twin?.result?.scenario_comparison?.is_disrupted ?? false;
  const activeScenario = runData?.scenario ?? "";

  const isHormuzBlocked = isDisrupted && (activeScenario === "hormuz_closure" || activeScenario.includes("hormuz"));
  const isRedSeaBlocked = isDisrupted && (activeScenario === "red_sea_threat" || activeScenario.includes("red_sea") || activeScenario.includes("sea"));

  // Flow status triggers
  const saudiStatus = isHormuzBlocked ? "delayed" : "safe";
  const iraqStatus = isHormuzBlocked ? "delayed" : "safe";
  const usStatus = isHormuzBlocked ? "alternative" : "safe";
  const nigeriaStatus = "safe";

  const hormuzStatus = isHormuzBlocked ? "blocked" : "safe";
  const redSeaStatus = isRedSeaBlocked ? "blocked" : "safe";

  const ship1Status = isHormuzBlocked ? "blocked" : "safe"; // MT Bailey
  const ship2Status = isHormuzBlocked ? "blocked" : "safe"; // MT Rodgers
  const ship3Status = isHormuzBlocked ? "alternative" : "safe"; // MT Falcon
  const ship4Status = "safe"; // MT Bonny

  const jamnagarStatus = isHormuzBlocked ? "stressed" : "safe";
  const kochiStatus = "safe";
  const paradipStatus = isHormuzBlocked ? "stressed" : "safe";

  const padurStatus = isHormuzBlocked ? "drawdown" : "normal";
  const mangaluruStatus = "normal";
  const vizagStatus = isHormuzBlocked ? "drawdown" : "normal";

  // Coordinates on 1000 x 600 viewbox canvas
  // C1: Suppliers (X=40)
  // C2: Corridors (X=270)
  // C3: Shipments (X=500)
  // C4: Refineries (X=730)
  // C5: SPR Caverns (X=960)

  const flows = [
    {
      id: "flow-saudi",
      label: "Saudi Aramco Supply Line",
      color: "rgba(16, 185, 129, 0.45)",
      hoverColor: "#10b981",
      path: [
        { x: 40, y: 90 }, // Saudi Port
        { x: 270, y: 120 }, // Hormuz Chokepoint
        { x: 500, y: 90 }, // MT Bailey
        { x: 730, y: 150 }, // Jamnagar Refinery
        { x: 960, y: 150 }, // Padur SPR Cavern
      ],
      isActive: true,
      isStressed: isHormuzBlocked,
    },
    {
      id: "flow-iraq",
      label: "SOMO Iraq Supply Line",
      color: "rgba(16, 185, 129, 0.45)",
      hoverColor: "#10b981",
      path: [
        { x: 40, y: 228 }, // Iraq Port
        { x: 270, y: 120 }, // Hormuz Chokepoint
        { x: 500, y: 228 }, // MT Rodgers
        { x: 730, y: 450 }, // Paradip Refinery
        { x: 960, y: 450 }, // Vizag SPR Cavern
      ],
      isActive: true,
      isStressed: isHormuzBlocked,
    },
    {
      id: "flow-us",
      label: "US Gulf Coast Alternative Flow",
      color: isHormuzBlocked ? "rgba(56, 189, 248, 0.45)" : "rgba(255, 255, 255, 0.08)",
      hoverColor: "#38bdf8",
      path: [
        { x: 40, y: 366 }, // US Port
        { x: 270, y: 384 }, // Cape of Good Hope
        { x: 500, y: 366 }, // MT Falcon
        { x: 730, y: 150 }, // Jamnagar Refinery
      ],
      isActive: true,
      isStressed: false,
    },
    {
      id: "flow-nigeria",
      label: "West African Direct Flow",
      color: "rgba(16, 185, 129, 0.45)",
      hoverColor: "#10b981",
      path: [
        { x: 40, y: 504 }, // Nigeria Port
        { x: 270, y: 516 }, // Direct Corridor
        { x: 500, y: 504 }, // MT Bonny
        { x: 730, y: 300 }, // Kochi Refinery
      ],
      isActive: true,
      isStressed: false,
    },
  ];

  // Helper function to draw curved bezier coordinates
  const makeBezierPath = (p: { x: number; y: number }[]) => {
    let d = "";
    for (let i = 0; i < p.length - 1; i++) {
      const p1 = p[i];
      const p2 = p[i + 1];
      const controlX = (p1.x + p2.x) / 2;
      d += `${i === 0 ? `M ${p1.x},${p1.y}` : ""} C ${controlX},${p1.y} ${controlX},${p2.y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  return (
    <div className="space-y-4">
      {/* Legend Block */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-950/40 border border-white/5 rounded-2xl text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Graph Flow Paths:</span>
          <div
            className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300 hover:text-slate-100 transition-colors"
            onMouseEnter={() => setHoveredFlow("flow-saudi")}
            onMouseLeave={() => setHoveredFlow(null)}
          >
            <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span>
            <span>Saudi-Jamnagar</span>
          </div>
          <div
            className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300 hover:text-slate-100 transition-colors"
            onMouseEnter={() => setHoveredFlow("flow-iraq")}
            onMouseLeave={() => setHoveredFlow(null)}
          >
            <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span>
            <span>Iraq-Paradip</span>
          </div>
          <div
            className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300 hover:text-slate-100 transition-colors"
            onMouseEnter={() => setHoveredFlow("flow-us")}
            onMouseLeave={() => setHoveredFlow(null)}
          >
            <span className={`w-3 h-0.5 ${isHormuzBlocked ? "bg-sky-400" : "bg-slate-700"} inline-block`}></span>
            <span>US-Jamnagar (Cape)</span>
          </div>
          <div
            className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-300 hover:text-slate-100 transition-colors"
            onMouseEnter={() => setHoveredFlow("flow-nigeria")}
            onMouseLeave={() => setHoveredFlow(null)}
          >
            <span className="w-3 h-0.5 bg-emerald-500 inline-block"></span>
            <span>Nigeria-Kochi</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 font-mono">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> NORMAL</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> DELAYED</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span> BLOCKED</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> STRESSED</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400"></span> ALTERNATIVE</span>
        </div>
      </div>

      {/* Main Graph Canvas Container */}
      <div className="relative w-full h-[600px] border border-white/5 rounded-3xl overflow-hidden bg-slate-950/20 shadow-inner">
        {/* SVG Bezier Connection Layers */}
        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
        >
          {flows.map((flow) => {
            const isSelfHovered = hoveredFlow === flow.id;
            const isAnyHovered = hoveredFlow !== null;
            
            // Adjust coloring
            let strokeColor = flow.color;
            let strokeWidth = 1.5;
            let strokeDash = undefined;

            if (isAnyHovered) {
              strokeColor = isSelfHovered ? flow.hoverColor : "rgba(255,255,255,0.02)";
              strokeWidth = isSelfHovered ? 3.5 : 1.0;
            } else if (flow.isStressed) {
              strokeColor = "rgba(239, 68, 68, 0.4)"; // Red flow line
              strokeWidth = 2.0;
              strokeDash = "8, 8";
            }

            return (
              <path
                key={flow.id}
                d={makeBezierPath(flow.path)}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDash}
                className="transition-all duration-300"
                style={{
                  filter: isSelfHovered ? `drop-shadow(0 0 4px ${flow.hoverColor})` : undefined,
                }}
              />
            );
          })}
        </svg>

        {/* HTML Glassmorphic Interactive Nodes Overlay */}

        {/* 1. Suppliers (Left Column 4%) */}
        <GraphNode
          id="SUP_SAUDI"
          name="Saudi Aramco (Tanura)"
          type="supplier"
          status={saudiStatus}
          statusLabel={isHormuzBlocked ? "DELAYED" : "SAFE"}
          left="4%"
          top="15%"
          valueLabel="8.0M bpd capacity"
          activeFlows={["flow-saudi"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="SUP_IRAQ"
          name="Iraq SOMO (Basrah)"
          type="supplier"
          status={iraqStatus}
          statusLabel={isHormuzBlocked ? "DELAYED" : "SAFE"}
          left="4%"
          top="38%"
          valueLabel="3.5M bpd capacity"
          activeFlows={["flow-iraq"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="SUP_US_GULF"
          name="US Gulf (Galveston)"
          type="supplier"
          status={usStatus}
          statusLabel={isHormuzBlocked ? "ACTIVE ALT" : "STANDBY"}
          left="4%"
          top="61%"
          valueLabel="4.0M bpd capacity"
          activeFlows={["flow-us"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="SUP_NIGERIA"
          name="Nigeria (Bonny)"
          type="supplier"
          status={nigeriaStatus}
          statusLabel="SAFE"
          left="4%"
          top="84%"
          valueLabel="1.5M bpd capacity"
          activeFlows={["flow-nigeria"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />

        {/* 2. Corridors (Second Column 27%) */}
        <GraphNode
          id="CORR_HORMUZ"
          name="Strait of Hormuz"
          type="chokepoint"
          status={hormuzStatus}
          statusLabel={isHormuzBlocked ? "BLOCKED" : "SAFE"}
          left="27%"
          top="20%"
          valueLabel="40% imports transit"
          activeFlows={["flow-saudi", "flow-iraq"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="CORR_RED_SEA"
          name="Red Sea Corridor"
          type="chokepoint"
          status={redSeaStatus}
          statusLabel={isRedSeaBlocked ? "BLOCKED" : "SAFE"}
          left="27%"
          top="42%"
          valueLabel="Bab-el-Mandeb Strait"
          activeFlows={[]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="CORR_CAPE"
          name="Cape of Good Hope"
          type="chokepoint"
          status={isHormuzBlocked ? "alternative" : "normal"}
          statusLabel={isHormuzBlocked ? "ACTIVE ALT" : "STANDBY"}
          left="27%"
          top="64%"
          valueLabel="+30 days transit route"
          activeFlows={["flow-us"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="CORR_DIRECT"
          name="Direct Ocean Route"
          type="chokepoint"
          status="normal"
          statusLabel="SAFE"
          left="27%"
          top="86%"
          valueLabel="Open sea routes"
          activeFlows={["flow-nigeria"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />

        {/* 3. Shipments / Tankers (Third Column 50%) */}
        <GraphNode
          id="SHP_Bailey"
          name="MT Bailey (VLCC)"
          type="shipment"
          status={ship1Status}
          statusLabel={isHormuzBlocked ? "ROUTE BLOCKED" : "IN TRANSIT"}
          left="50%"
          top="15%"
          valueLabel="2.0M barrels cargo"
          activeFlows={["flow-saudi"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="SHP_Rodgers"
          name="MT Rodgers (Suezmax)"
          type="shipment"
          status={ship2Status}
          statusLabel={isHormuzBlocked ? "ROUTE BLOCKED" : "IN TRANSIT"}
          left="50%"
          top="38%"
          valueLabel="1.0M barrels cargo"
          activeFlows={["flow-iraq"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="SHP_Falcon"
          name="MT Falcon (VLCC)"
          type="shipment"
          status={ship3Status}
          statusLabel={isHormuzBlocked ? "REROUTED (CAPE)" : "IN TRANSIT"}
          left="50%"
          top="61%"
          valueLabel="2.0M barrels cargo"
          activeFlows={["flow-us"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="SHP_Bonny"
          name="MT Bonny (Suezmax)"
          type="shipment"
          status={ship4Status}
          statusLabel="IN TRANSIT"
          left="50%"
          top="84%"
          valueLabel="1.2M barrels cargo"
          activeFlows={["flow-nigeria"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />

        {/* 4. Refineries (Fourth Column 73%) */}
        <GraphNode
          id="REF_JAMNAGAR"
          name="Jamnagar Refinery"
          type="refinery"
          status={jamnagarStatus}
          statusLabel={isHormuzBlocked ? "RISK CRITICAL" : "SAFE"}
          left="73%"
          top="25%"
          valueLabel={isHormuzBlocked ? "Run-rate: 74% (11d left)" : "Run-rate: 98% utilization"}
          activeFlows={["flow-saudi", "flow-us"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="REF_KOCHI"
          name="BPCL Kochi Refinery"
          type="refinery"
          status={kochiStatus}
          statusLabel="SAFE"
          left="73%"
          top="50%"
          valueLabel="Run-rate: 95% utilization"
          activeFlows={["flow-nigeria"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="REF_PARADIP"
          name="IOCL Paradip Refinery"
          type="refinery"
          status={paradipStatus}
          statusLabel={isHormuzBlocked ? "RISK CRITICAL" : "SAFE"}
          left="73%"
          top="75%"
          valueLabel={isHormuzBlocked ? "Run-rate: 62% (8d left)" : "Run-rate: 96% utilization"}
          activeFlows={["flow-iraq"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />

        {/* 5. Strategic Reserves (Fifth Column 96%) */}
        <GraphNode
          id="SPR_PADUR"
          name="SPR Padur Cavern"
          type="spr"
          status={padurStatus}
          statusLabel={isHormuzBlocked ? "DRAWDOWN RELEASE" : "STANDBY STOCK"}
          left="96%"
          top="25%"
          valueLabel={isHormuzBlocked ? "-250k bpd draw to Jamnagar" : "14.2M barrels loaded"}
          activeFlows={["flow-saudi"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="SPR_MANGALURU"
          name="SPR Mangaluru Cavern"
          type="spr"
          status={mangaluruStatus}
          statusLabel="STANDBY STOCK"
          left="96%"
          top="50%"
          valueLabel="8.5M barrels loaded"
          activeFlows={[]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
        <GraphNode
          id="SPR_VIZAG"
          name="SPR Visakhapatnam Cavern"
          type="spr"
          status={vizagStatus}
          statusLabel={isHormuzBlocked ? "DRAWDOWN RELEASE" : "STANDBY STOCK"}
          left="96%"
          top="75%"
          valueLabel={isHormuzBlocked ? "-120k bpd draw to Paradip" : "9.1M barrels loaded"}
          activeFlows={["flow-iraq"]}
          hoveredFlow={hoveredFlow}
          setHoveredFlow={setHoveredFlow}
        />
      </div>
    </div>
  );
}
