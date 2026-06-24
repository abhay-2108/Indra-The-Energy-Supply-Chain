"use client";

import React, { useState, useEffect } from "react";
import { useSimulation } from "@/context/SimulationContext";
import { getInfrastructure, getShipments, getRoutes } from "@/lib/api";
import { 
  Building2, 
  Database, 
  Globe, 
  Compass, 
  ShieldAlert, 
  ArrowRight, 
  Activity,
  Ship, 
  Anchor, 
  AlertTriangle,
  Info,
  TrendingUp
} from "lucide-react";

// Safe casting formatting helpers to prevent runtime TypeError exceptions on nulls/strings
const safeFixed = (val: any, decimals = 1, fallback = "0.0") => {
  const num = Number(val);
  return isNaN(num) ? fallback : num.toFixed(decimals);
};

const safeLocale = (val: any, fallback = "0") => {
  const num = Number(val);
  return isNaN(num) ? fallback : num.toLocaleString();
};

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
  onClickNode: () => void;
  isHovered: boolean;
  onHoverNode: (isHovered: boolean) => void;
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
  onClickNode,
  isHovered,
  onHoverNode,
}: NodeProps) {
  const isHighlighted = hoveredFlow ? activeFlows.includes(hoveredFlow) : false;
  const isDimmed = hoveredFlow ? !isHighlighted : false;

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

  const getIcon = () => {
    switch (type) {
      case "supplier":
        return <Globe size={13} className={textGlow} />;
      case "chokepoint":
        return <Compass size={13} className={textGlow} />;
      case "shipment":
        return <Ship size={13} className={textGlow} />;
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
        isHighlighted || isHovered ? "scale-105 border-emerald-400/60 ring-1 ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]" : ""
      } ${isDimmed ? "opacity-30" : "opacity-100"}`}
      onMouseEnter={() => {
        onHoverNode(true);
        if (activeFlows.length > 0) {
          setHoveredFlow(activeFlows[0]);
        }
      }}
      onMouseLeave={() => {
        onHoverNode(false);
        setHoveredFlow(null);
      }}
      onClick={onClickNode}
    >
      <div className="flex items-center justify-between gap-1.5 border-b border-white/5 pb-1 mb-1.5">
        <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase font-mono truncate">{id}</span>
        <div className="flex items-center gap-1">
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
  
  // Real database state
  const [infra, setInfra] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Load infrastructure static data
  useEffect(() => {
    async function loadStaticData() {
      try {
        const data = await getInfrastructure();
        setInfra(data);
      } catch (e) {
        console.error("Failed to fetch infrastructure", e);
      }
    }
    loadStaticData();
  }, []);

  // Poll active shipments and routes to reflect stream movements
  useEffect(() => {
    async function loadDynamicTelemetry() {
      try {
        const [shipData, routeData] = await Promise.all([
          getShipments(),
          getRoutes()
        ]);
        setShipments(shipData || []);
        setRoutes(routeData || []);
      } catch (e) {
        console.error("Failed to load telemetry updates", e);
      } finally {
        setLoading(false);
      }
    }

    loadDynamicTelemetry();
    const timer = setInterval(loadDynamicTelemetry, 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !infra) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-xs font-semibold">Mapping Real-Time Knowledge Graph...</p>
        </div>
      </div>
    );
  }

  // Active Simulation states
  const isDisrupted = runData?.digital_twin?.result?.scenario_comparison?.is_disrupted ?? false;
  const activeScenario = runData?.scenario ?? "";
  const isHormuzBlocked = isDisrupted && (activeScenario === "hormuz_closure" || activeScenario.includes("hormuz"));
  const isRedSeaBlocked = isDisrupted && (activeScenario === "red_sea_threat" || activeScenario.includes("red_sea") || activeScenario.includes("sea"));

  // DB Node Matchers
  const suppliersDb = infra.suppliers || [];
  const refineriesDb = infra.refineries || [];
  const sprsDb = infra.spr_inventory || [];

  const getDbSupplier = (id: string) => suppliersDb.find((s: any) => s.id === id) || { 
    name: id, 
    max_export_capacity_bpd: 0, 
    crude_grade: "Unknown", 
    region: "Unknown",
    port_latitude: 0,
    port_longitude: 0 
  };
  const getDbRefinery = (id: string) => refineriesDb.find((r: any) => r.id === id) || { 
    name: id, 
    capacity_bpd: 0, 
    current_inventory_barrels: 0,
    latitude: 0,
    longitude: 0
  };
  const getDbSpr = (id: string) => sprsDb.find((s: any) => s.id === id) || { 
    location: id, 
    capacity_barrels: 0, 
    current_inventory_barrels: 0, 
    max_drawdown_bpd: 0,
    latitude: 0,
    longitude: 0
  };

  // Find dynamic shipments on the 4 key routes (or generic fallback if none)
  const getActiveShipmentForRoute = (routeId: string, fallbackName: string, fallbackVolume: number) => {
    // Filter active shipments
    const active = shipments.filter(s => s.route_id === routeId && s.current_status !== "COMPLETED");
    if (active.length > 0) {
      const mainShip = active[0];
      return {
        id: mainShip.id,
        vessel_name: mainShip.vessel_name,
        vessel_type: mainShip.vessel_type || "VLCC",
        volume_barrels: mainShip.volume_barrels,
        current_status: mainShip.current_status,
        route_progress: mainShip.route_progress || 0.0,
        extraCount: active.length - 1,
        lat: mainShip.current_latitude,
        lng: mainShip.current_longitude
      };
    }
    
    // Hardcoded fallback state
    return {
      id: `SHP_${routeId.split("_")[1]}`,
      vessel_name: fallbackName,
      vessel_type: "VLCC",
      volume_barrels: fallbackVolume,
      current_status: isHormuzBlocked && (routeId.includes("SAUDI") || routeId.includes("IRAQ")) ? "BLOCKED" : "IN_TRANSIT",
      route_progress: 0.45,
      extraCount: 0,
      lat: null,
      lng: null
    };
  };

  const shipSaudi = getActiveShipmentForRoute("RT_SAUDI_JAMNAGAR", "MT Bailey", 2000000);
  const shipIraq = getActiveShipmentForRoute("RT_IRAQ_PARADIP", "MT Rodgers", 1000000);
  const shipUs = getActiveShipmentForRoute("RT_US_JAMNAGAR", "MT Falcon", 2000000);
  const shipNigeria = getActiveShipmentForRoute("RT_NIGERIA_KOCHI", "MT Bonny", 1200000);

  // Status triggers
  const saudiStatus = isHormuzBlocked ? "delayed" : "safe";
  const iraqStatus = isHormuzBlocked ? "delayed" : "safe";
  const usStatus = isHormuzBlocked ? "alternative" : "safe";
  const nigeriaStatus = "safe";

  const hormuzStatus = isHormuzBlocked ? "blocked" : "safe";
  const redSeaStatus = isRedSeaBlocked ? "blocked" : "safe";

  const jamnagarStatus = isHormuzBlocked ? "stressed" : "safe";
  const kochiStatus = "safe";
  const paradipStatus = isHormuzBlocked ? "stressed" : "safe";

  const padurStatus = isHormuzBlocked ? "drawdown" : "normal";
  const mangaluruStatus = "normal";
  const vizagStatus = isHormuzBlocked ? "drawdown" : "normal";

  // Coordinates on 1000 x 600 viewbox canvas
  const flows = [
    {
      id: "flow-saudi",
      label: "Saudi-Jamnagar Corridor",
      color: isHormuzBlocked ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.45)",
      hoverColor: isHormuzBlocked ? "#ef4444" : "#10b981",
      isStressed: isHormuzBlocked,
      path: [
        { x: 40, y: 90 }, // Saudi Port
        { x: 270, y: 120 }, // Hormuz Chokepoint
        { x: 500, y: 90 }, // Tanker
        { x: 730, y: 150 }, // Jamnagar Refinery
        { x: 960, y: 150 }, // Padur Cavern
      ],
    },
    {
      id: "flow-iraq",
      label: "Iraq-Paradip Corridor",
      color: isHormuzBlocked ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.45)",
      hoverColor: isHormuzBlocked ? "#ef4444" : "#10b981",
      isStressed: isHormuzBlocked,
      path: [
        { x: 40, y: 228 }, // Iraq Port
        { x: 270, y: 120 }, // Hormuz Chokepoint
        { x: 500, y: 228 }, // Tanker
        { x: 730, y: 450 }, // Paradip Refinery
        { x: 960, y: 450 }, // Vizag Cavern
      ],
    },
    {
      id: "flow-us",
      label: "US-Jamnagar (Cape Alternate)",
      color: isHormuzBlocked ? "rgba(56, 189, 248, 0.45)" : "rgba(255, 255, 255, 0.08)",
      hoverColor: "#38bdf8",
      isStressed: false,
      path: [
        { x: 40, y: 366 }, // US Port
        { x: 270, y: 384 }, // Cape of Good Hope
        { x: 500, y: 366 }, // Tanker
        { x: 730, y: 150 }, // Jamnagar Refinery
      ],
    },
    {
      id: "flow-nigeria",
      label: "West African Direct Line",
      color: "rgba(16, 185, 129, 0.45)",
      hoverColor: "#10b981",
      isStressed: false,
      path: [
        { x: 40, y: 504 }, // Nigeria Port
        { x: 270, y: 516 }, // Direct Corridor
        { x: 500, y: 504 }, // Tanker
        { x: 730, y: 300 }, // Kochi Refinery
      ],
    },
  ];

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

  // Node details generator for the sidebar
  const getDetailNodeInfo = (nodeId: string, type: string) => {
    if (type === "supplier") {
      const db = getDbSupplier(nodeId);
      const isAffected = isHormuzBlocked && (nodeId === "SUP_SAUDI" || nodeId === "SUP_IRAQ");
      return {
        title: db.name,
        subtitle: `Global Supply Node • ${nodeId}`,
        type: "supplier",
        status: isAffected ? "Delayed / Restricted" : "Safe",
        statusColor: isAffected ? "text-amber-400" : "text-emerald-400",
        stats: [
          { label: "Export Capacity", value: `${safeFixed(db.max_export_capacity_bpd / 1000000, 1)}M bpd` },
          { label: "Export Region", value: db.region },
          { label: "Crude Grade", value: db.crude_grade },
          { label: "Telemetry coordinates", value: `[${safeFixed(db.port_latitude, 3)}°, ${safeFixed(db.port_longitude, 3)}°]` }
        ],
        details: isAffected 
          ? "Supply channels transit through the Strait of Hormuz which is currently disrupted. Tankers loading from this terminal are subject to route rerouting and severe cargo delays."
          : "Operations at this loading terminal are normal. Maritime shipments are progressing along active direct shipping corridors."
      };
    }
    
    if (type === "chokepoint") {
      const isBlocked = (nodeId === "CORR_HORMUZ" && isHormuzBlocked) || (nodeId === "CORR_RED_SEA" && isRedSeaBlocked);
      const isAltActive = nodeId === "CORR_CAPE" && isHormuzBlocked;
      let label = "Safe / Open";
      let color = "text-emerald-400";
      let desc = "Corridor is open. Commercial vessels transiting this channel are reporting standard transit times.";

      if (isBlocked) {
        label = "BLOCKED / THREAT ALERT";
        color = "text-red-400";
        desc = "Critical maritime threat. Security agents have declared navigation restricted. High risk of naval capture or drone strikes.";
      } else if (isAltActive) {
        label = "ACTIVE ALTERNATIVE ROUTE";
        color = "text-sky-400";
        desc = "Vessels rerouted around this zone. Incurs an additional 30-35 days of transit time, causing temporary pricing premiums.";
      } else if (nodeId === "CORR_CAPE") {
        label = "STANDBY CORRIDOR";
        color = "text-slate-400";
        desc = "Standby routing. Usually avoided due to the lengthy transit footprint unless major Middle East chokepoints close.";
      }

      return {
        title: nodeId === "CORR_HORMUZ" ? "Strait of Hormuz" : nodeId === "CORR_RED_SEA" ? "Red Sea Corridor" : nodeId === "CORR_CAPE" ? "Cape of Good Hope" : "Direct Ocean Route",
        subtitle: `Maritime Transit Chokepoint`,
        type: "chokepoint",
        status: label,
        statusColor: color,
        stats: [
          { label: "Channel Transit Rate", value: nodeId === "CORR_HORMUZ" ? "40% of Crude Imports" : "Bab-el-Mandeb Strait" },
          { label: "Alternative Penalty", value: nodeId === "CORR_HORMUZ" ? "+30 Days Cape Bypass" : "+22 Days Suez Bypass" }
        ],
        details: desc
      };
    }

    if (type === "shipment") {
      let ship = shipSaudi;
      let routeLabel = "Saudi-Jamnagar";
      if (nodeId === "SHP_Rodgers") { ship = shipIraq; routeLabel = "Iraq-Paradip"; }
      if (nodeId === "SHP_Falcon") { ship = shipUs; routeLabel = "US-Jamnagar"; }
      if (nodeId === "SHP_Bonny") { ship = shipNigeria; routeLabel = "Nigeria-Kochi"; }

      const progressPercent = safeFixed(ship.route_progress * 100, 0);
      const isShipBlocked = ship.current_status === "BLOCKED";

      return {
        title: ship.vessel_name,
        subtitle: `${ship.vessel_type} Tanker • ${ship.id}`,
        type: "shipment",
        status: ship.current_status,
        statusColor: isShipBlocked ? "text-red-400" : "text-emerald-400",
        stats: [
          { label: "Vessel Type", value: ship.vessel_type },
          { label: "Cargo Volume", value: `${safeFixed(ship.volume_barrels / 1000000, 1)}M Barrels` },
          { label: "Route Transit Progress", value: `${progressPercent}% Completed` },
          { label: "Assigned Route", value: routeLabel },
          { label: "Other Vessels in Route", value: ship.extraCount > 0 ? `${ship.extraCount} active` : "None" }
        ],
        details: isShipBlocked
          ? "This tanker is currently stuck inside a geopolitical danger zone. Port authorities have ordered the vessel to halt transit pending escort clearance."
          : `This tanker is in transit carrying crude blend components. Estimated progress is currently showing at ${progressPercent}%.`
      };
    }

    if (type === "refinery") {
      const db = getDbRefinery(nodeId);
      const simRate = runData?.scenario_modeller?.result?.refinery_run_rates?.[nodeId];
      const stockout = runData?.scenario_modeller?.result?.refinery_days_to_stockout?.[nodeId];

      const hasStress = isHormuzBlocked && (nodeId === "REF_JAMNAGAR" || nodeId === "REF_PARADIP");

      return {
        title: db.name,
        subtitle: `Refining Asset • ${nodeId}`,
        type: "refinery",
        status: hasStress ? "STRESSED (SUPPLY SHORTAGE)" : "SAFE / OPERATIONAL",
        statusColor: hasStress ? "text-orange-400 animate-pulse" : "text-emerald-400",
        stats: [
          { label: "Capacity (bpd)", value: safeLocale(db.capacity_bpd) },
          { label: "Crude Stockpile (bbl)", value: `${safeLocale(db.current_inventory_barrels)} Barrels` },
          { label: "Normal Run-Rate", value: simRate ? `${simRate.normal_utilization}%` : "95-98% utilization" },
          ...(simRate && hasStress ? [
            { label: "Simulated Run-Rate", value: `${simRate.projected_utilization}%` },
            { label: "Days to Stockout", value: stockout !== undefined ? `${stockout} Days` : "N/A" }
          ] : [])
        ],
        details: hasStress
          ? `Supply disruptions have restricted incoming crudes. Refining run-rates have dropped, leading to a critical ${stockout}-day stockpiles stockout countdown.`
          : "Refinery operations are performing at nominal levels. Baseline inventories are currently sufficient for downstream distribution."
      };
    }

    if (type === "spr") {
      const db = getDbSpr(nodeId);
      const schedule = runData?.spr_optimisation?.result?.drawdown_schedule || [];
      const activeDraw = schedule.find((item: any) => item.spr_id === nodeId);
      const depletion = runData?.spr_optimisation?.result?.spr_depletion_forecast?.[nodeId];

      return {
        title: db.location,
        subtitle: `Strategic Reserve Cavern • ${nodeId}`,
        type: "spr",
        status: activeDraw ? "ACTIVE DRAWDOWN RELEASE" : "STANDBY RESERVES",
        statusColor: activeDraw ? "text-emerald-400 animate-pulse" : "text-indigo-400",
        stats: [
          { label: "Capacity (bbl)", value: safeLocale(db.capacity_barrels) },
          { label: "Current Stockpile", value: `${safeLocale(db.current_inventory_barrels)} Barrels` },
          { label: "Max Drawdown Cap", value: `${safeLocale(db.max_drawdown_bpd)} bpd` },
          ...(activeDraw ? [
            { label: "Drawdown Release Rate", value: `${safeLocale(activeDraw.drawdown_rate_bpd)} bpd` },
            { label: "Allocated Delivery", value: activeDraw.refinery_id },
            { label: "Remaining Reserves", value: depletion ? `${safeFixed(depletion.post_event_barrels / 1000000, 1)}M bbl (${safeFixed(100 - depletion.percent_depleted, 1)}%)` : "N/A" }
          ] : [])
        ],
        details: activeDraw
          ? `Releasing ${safeLocale(activeDraw.drawdown_rate_bpd)} bpd to ${activeDraw.refinery_id} to prevent crude stockout due to corridor blockage.`
          : "Strategic crude cavern remains fully loaded at standby capacity. Ready to release reserves upon ministry override authorization."
      };
    }

    return null;
  };

  const getGlobalLogisticsSummary = () => {
    const totalActiveVessels = shipments.filter(s => s.current_status !== "COMPLETED").length;
    const totalCargoVolume = shipments
      .filter(s => s.current_status !== "COMPLETED")
      .reduce((sum, s) => sum + (s.volume_barrels || 0), 0);
    const blockedVessels = shipments.filter(s => s.current_status === "BLOCKED").length;

    const totalCapacity = sprsDb.reduce((sum: number, s: any) => sum + (s.capacity_barrels || 0), 0);
    const currentStock = sprsDb.reduce((sum: number, s: any) => sum + (s.current_inventory_barrels || 0), 0);
    const fillPercent = totalCapacity ? ((currentStock / totalCapacity) * 100).toFixed(0) : "0";

    return {
      totalActiveVessels,
      totalCargoVolume,
      blockedVessels,
      fillPercent,
      title: activeScenario ? `Simulation: ${activeScenario.replace("_", " ").toUpperCase()}` : "Baseline Operations",
    };
  };

  const globalSummary = getGlobalLogisticsSummary();
  const activeDetail = selectedNode || (hoveredNodeId ? getDetailNodeInfo(hoveredNodeId.split("-")[0], hoveredNodeId.split("-")[1]) : null);

  return (
    <div className="space-y-4">
      {/* CSS Flow Animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes strokeFlowGreen {
          to { stroke-dashoffset: -40; }
        }
        @keyframes strokeFlowRed {
          to { stroke-dashoffset: -40; }
        }
        @keyframes strokeFlowSky {
          to { stroke-dashoffset: -40; }
        }
        .flow-green-line {
          stroke-dasharray: 8, 8;
          animation: strokeFlowGreen 3s linear infinite;
        }
        .flow-red-line {
          stroke-dasharray: 8, 8;
          animation: strokeFlowRed 6s linear infinite;
        }
        .flow-sky-line {
          stroke-dasharray: 8, 8;
          animation: strokeFlowSky 1.5s linear infinite;
        }
      `}} />

      {/* Legend Block */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-950/40 border border-white/5 rounded-2xl text-xs">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Graph Flow Paths:</span>
          {flows.map(f => (
            <div
              key={f.id}
              className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-355 hover:text-slate-105 transition-colors"
              onMouseEnter={() => setHoveredFlow(f.id)}
              onMouseLeave={() => setHoveredFlow(null)}
            >
              <span className={`w-3 h-0.5 inline-block ${
                f.id === "flow-saudi" || f.id === "flow-iraq"
                  ? (isHormuzBlocked ? "bg-red-500" : "bg-emerald-500")
                  : (f.id === "flow-us" && isHormuzBlocked ? "bg-sky-400" : "bg-emerald-500")
              }`}></span>
              <span>{f.label.split(" ")[0]}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 font-mono">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> NORMAL</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> DELAYED</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span> BLOCKED</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> STRESSED</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400"></span> ALTERNATIVE</span>
        </div>
      </div>

      {/* Main Grid: Graph + Side Drawer */}
      <div className="flex flex-col lg:flex-row gap-5 items-stretch">
        
        {/* Canvas Area */}
        <div className="flex-1 relative h-[600px] border border-white/5 rounded-3xl overflow-hidden bg-slate-950/20 shadow-inner">
          <svg
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
          >
            {flows.map((flow) => {
              const isSelfHovered = hoveredFlow === flow.id;
              const isAnyHovered = hoveredFlow !== null;
              
              let strokeColor = flow.color;
              let strokeWidth = 1.5;
              let strokeClass = "flow-green-line";

              if (isAnyHovered) {
                strokeColor = isSelfHovered ? flow.hoverColor : "rgba(255,255,255,0.01)";
                strokeWidth = isSelfHovered ? 3.5 : 1.0;
              }

              if (flow.isStressed) {
                strokeClass = "flow-red-line";
              } else if (flow.id === "flow-us" && isHormuzBlocked) {
                strokeClass = "flow-sky-line";
              }

              return (
                <path
                  key={flow.id}
                  d={makeBezierPath(flow.path)}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  className={`${strokeClass} transition-all duration-300`}
                  style={{
                    filter: isSelfHovered ? `drop-shadow(0 0 5px ${flow.hoverColor})` : undefined,
                  }}
                />
              );
            })}
          </svg>

          {/* 1. Suppliers Column (4%) */}
          <GraphNode
            id="SUP_SAUDI"
            name={getDbSupplier("SUP_SAUDI").name}
            type="supplier"
            status={saudiStatus}
            statusLabel={isHormuzBlocked ? "DELAYED" : "SAFE"}
            left="8%"
            top="15%"
            valueLabel={`${safeFixed(getDbSupplier("SUP_SAUDI").max_export_capacity_bpd / 1000000, 1)}M bpd capacity`}
            activeFlows={["flow-saudi"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SUP_SAUDI", "supplier"))}
            isHovered={hoveredNodeId === "SUP_SAUDI-supplier"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SUP_SAUDI-supplier" : null)}
          />
          <GraphNode
            id="SUP_IRAQ"
            name={getDbSupplier("SUP_IRAQ").name}
            type="supplier"
            status={iraqStatus}
            statusLabel={isHormuzBlocked ? "DELAYED" : "SAFE"}
            left="8%"
            top="38%"
            valueLabel={`${safeFixed(getDbSupplier("SUP_IRAQ").max_export_capacity_bpd / 1000000, 1)}M bpd capacity`}
            activeFlows={["flow-iraq"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SUP_IRAQ", "supplier"))}
            isHovered={hoveredNodeId === "SUP_IRAQ-supplier"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SUP_IRAQ-supplier" : null)}
          />
          <GraphNode
            id="SUP_US_GULF"
            name={getDbSupplier("SUP_US_GULF").name}
            type="supplier"
            status={usStatus}
            statusLabel={isHormuzBlocked ? "ACTIVE ALT" : "STANDBY"}
            left="8%"
            top="61%"
            valueLabel={`${safeFixed(getDbSupplier("SUP_US_GULF").max_export_capacity_bpd / 1000000, 1)}M bpd capacity`}
            activeFlows={["flow-us"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SUP_US_GULF", "supplier"))}
            isHovered={hoveredNodeId === "SUP_US_GULF-supplier"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SUP_US_GULF-supplier" : null)}
          />
          <GraphNode
            id="SUP_NIGERIA"
            name={getDbSupplier("SUP_NIGERIA").name}
            type="supplier"
            status={nigeriaStatus}
            statusLabel="SAFE"
            left="8%"
            top="84%"
            valueLabel={`${safeFixed(getDbSupplier("SUP_NIGERIA").max_export_capacity_bpd / 1000000, 1)}M bpd capacity`}
            activeFlows={["flow-nigeria"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SUP_NIGERIA", "supplier"))}
            isHovered={hoveredNodeId === "SUP_NIGERIA-supplier"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SUP_NIGERIA-supplier" : null)}
          />

          {/* 2. Corridors Column (29%) */}
          <GraphNode
            id="CORR_HORMUZ"
            name="Strait of Hormuz"
            type="chokepoint"
            status={hormuzStatus}
            statusLabel={isHormuzBlocked ? "BLOCKED" : "SAFE"}
            left="29%"
            top="20%"
            valueLabel="40% imports transit"
            activeFlows={["flow-saudi", "flow-iraq"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("CORR_HORMUZ", "chokepoint"))}
            isHovered={hoveredNodeId === "CORR_HORMUZ-chokepoint"}
            onHoverNode={(h) => setHoveredNodeId(h ? "CORR_HORMUZ-chokepoint" : null)}
          />
          <GraphNode
            id="CORR_RED_SEA"
            name="Red Sea Corridor"
            type="chokepoint"
            status={redSeaStatus}
            statusLabel={isRedSeaBlocked ? "BLOCKED" : "SAFE"}
            left="29%"
            top="42%"
            valueLabel="Bab-el-Mandeb Strait"
            activeFlows={[]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("CORR_RED_SEA", "chokepoint"))}
            isHovered={hoveredNodeId === "CORR_RED_SEA-chokepoint"}
            onHoverNode={(h) => setHoveredNodeId(h ? "CORR_RED_SEA-chokepoint" : null)}
          />
          <GraphNode
            id="CORR_CAPE"
            name="Cape of Good Hope"
            type="chokepoint"
            status={isHormuzBlocked ? "alternative" : "normal"}
            statusLabel={isHormuzBlocked ? "ACTIVE ALT" : "STANDBY"}
            left="29%"
            top="64%"
            valueLabel="+30 days bypass route"
            activeFlows={["flow-us"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("CORR_CAPE", "chokepoint"))}
            isHovered={hoveredNodeId === "CORR_CAPE-chokepoint"}
            onHoverNode={(h) => setHoveredNodeId(h ? "CORR_CAPE-chokepoint" : null)}
          />
          <GraphNode
            id="CORR_DIRECT"
            name="Direct Ocean Route"
            type="chokepoint"
            status="normal"
            statusLabel="SAFE"
            left="29%"
            top="86%"
            valueLabel="Open sea route"
            activeFlows={["flow-nigeria"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("CORR_DIRECT", "chokepoint"))}
            isHovered={hoveredNodeId === "CORR_DIRECT-chokepoint"}
            onHoverNode={(h) => setHoveredNodeId(h ? "CORR_DIRECT-chokepoint" : null)}
          />

          {/* 3. Shipments Column (51%) */}
          <GraphNode
            id="SHP_Bailey"
            name={shipSaudi.vessel_name}
            type="shipment"
            status={shipSaudi.current_status === "BLOCKED" ? "blocked" : "safe"}
            statusLabel={shipSaudi.current_status === "BLOCKED" ? "BLOCKED" : `${safeFixed(shipSaudi.route_progress * 100, 0)}% PROGRESS`}
            left="51%"
            top="15%"
            valueLabel={`${safeFixed(shipSaudi.volume_barrels / 1000000, 1)}M bbls cargo`}
            activeFlows={["flow-saudi"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SHP_Bailey", "shipment"))}
            isHovered={hoveredNodeId === "SHP_Bailey-shipment"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SHP_Bailey-shipment" : null)}
          />
          <GraphNode
            id="SHP_Rodgers"
            name={shipIraq.vessel_name}
            type="shipment"
            status={shipIraq.current_status === "BLOCKED" ? "blocked" : "safe"}
            statusLabel={shipIraq.current_status === "BLOCKED" ? "BLOCKED" : `${safeFixed(shipIraq.route_progress * 100, 0)}% PROGRESS`}
            left="51%"
            top="38%"
            valueLabel={`${safeFixed(shipIraq.volume_barrels / 1000000, 1)}M bbls cargo`}
            activeFlows={["flow-iraq"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SHP_Rodgers", "shipment"))}
            isHovered={hoveredNodeId === "SHP_Rodgers-shipment"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SHP_Rodgers-shipment" : null)}
          />
          <GraphNode
            id="SHP_Falcon"
            name={shipUs.vessel_name}
            type="shipment"
            status={shipUs.current_status === "BLOCKED" ? "blocked" : "alternative"}
            statusLabel={`${safeFixed(shipUs.route_progress * 100, 0)}% PROGRESS`}
            left="51%"
            top="61%"
            valueLabel={`${safeFixed(shipUs.volume_barrels / 1000000, 1)}M bbls cargo`}
            activeFlows={["flow-us"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SHP_Falcon", "shipment"))}
            isHovered={hoveredNodeId === "SHP_Falcon-shipment"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SHP_Falcon-shipment" : null)}
          />
          <GraphNode
            id="SHP_Bonny"
            name={shipNigeria.vessel_name}
            type="shipment"
            status="safe"
            statusLabel={`${safeFixed(shipNigeria.route_progress * 100, 0)}% PROGRESS`}
            left="51%"
            top="84%"
            valueLabel={`${safeFixed(shipNigeria.volume_barrels / 1000000, 1)}M bbls cargo`}
            activeFlows={["flow-nigeria"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SHP_Bonny", "shipment"))}
            isHovered={hoveredNodeId === "SHP_Bonny-shipment"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SHP_Bonny-shipment" : null)}
          />

          {/* 4. Refineries Column (72%) */}
          <GraphNode
            id="REF_JAMNAGAR"
            name={getDbRefinery("REF_JAMNAGAR").name}
            type="refinery"
            status={jamnagarStatus}
            statusLabel={isHormuzBlocked ? "RISK CRITICAL" : "SAFE"}
            left="72%"
            top="25%"
            valueLabel={isHormuzBlocked ? "Capacity: 1.40M bpd" : "Nominal Utilization"}
            activeFlows={["flow-saudi", "flow-us"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("REF_JAMNAGAR", "refinery"))}
            isHovered={hoveredNodeId === "REF_JAMNAGAR-refinery"}
            onHoverNode={(h) => setHoveredNodeId(h ? "REF_JAMNAGAR-refinery" : null)}
          />
          <GraphNode
            id="REF_KOCHI"
            name={getDbRefinery("REF_KOCHI").name}
            type="refinery"
            status={kochiStatus}
            statusLabel="SAFE"
            left="72%"
            top="50%"
            valueLabel="Nominal Utilization"
            activeFlows={["flow-nigeria"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("REF_KOCHI", "refinery"))}
            isHovered={hoveredNodeId === "REF_KOCHI-refinery"}
            onHoverNode={(h) => setHoveredNodeId(h ? "REF_KOCHI-refinery" : null)}
          />
          <GraphNode
            id="REF_PARADIP"
            name={getDbRefinery("REF_PARADIP").name}
            type="refinery"
            status={paradipStatus}
            statusLabel={isHormuzBlocked ? "RISK CRITICAL" : "SAFE"}
            left="72%"
            top="75%"
            valueLabel={isHormuzBlocked ? "Capacity: 300k bpd" : "Nominal Utilization"}
            activeFlows={["flow-iraq"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("REF_PARADIP", "refinery"))}
            isHovered={hoveredNodeId === "REF_PARADIP-refinery"}
            onHoverNode={(h) => setHoveredNodeId(h ? "REF_PARADIP-refinery" : null)}
          />

          {/* 5. SPR Caverns Column (93%) */}
          <GraphNode
            id="SPR_PADUR"
            name="SPR Padur Cavern"
            type="spr"
            status={padurStatus}
            statusLabel={isHormuzBlocked ? "DRAWDOWN RELEASE" : "STANDBY STOCK"}
            left="93%"
            top="25%"
            valueLabel={`${safeFixed(getDbSpr("SPR_PADUR").current_inventory_barrels / 1000000, 1)}M bbl loaded`}
            activeFlows={["flow-saudi"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SPR_PADUR", "spr"))}
            isHovered={hoveredNodeId === "SPR_PADUR-spr"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SPR_PADUR-spr" : null)}
          />
          <GraphNode
            id="SPR_MANGALURU"
            name="SPR Mangaluru"
            type="spr"
            status={mangaluruStatus}
            statusLabel="STANDBY STOCK"
            left="93%"
            top="50%"
            valueLabel={`${safeFixed(getDbSpr("SPR_MANGALURU").current_inventory_barrels / 1000000, 1)}M bbl loaded`}
            activeFlows={[]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SPR_MANGALURU", "spr"))}
            isHovered={hoveredNodeId === "SPR_MANGALURU-spr"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SPR_MANGALURU-spr" : null)}
          />
          <GraphNode
            id="SPR_VIZAG"
            name="SPR Visakhapatnam"
            type="spr"
            status={vizagStatus}
            statusLabel={isHormuzBlocked ? "DRAWDOWN RELEASE" : "STANDBY STOCK"}
            left="93%"
            top="75%"
            valueLabel={`${safeFixed(getDbSpr("SPR_VIZAG").current_inventory_barrels / 1000000, 1)}M bbl loaded`}
            activeFlows={["flow-iraq"]}
            hoveredFlow={hoveredFlow}
            setHoveredFlow={setHoveredFlow}
            onClickNode={() => setSelectedNode(getDetailNodeInfo("SPR_VIZAG", "spr"))}
            isHovered={hoveredNodeId === "SPR_VIZAG-spr"}
            onHoverNode={(h) => setHoveredNodeId(h ? "SPR_VIZAG-spr" : null)}
          />
        </div>

        {/* Sidebar Info Drawer */}
        <div className="w-full lg:w-80 glass-panel rounded-3xl p-6 flex flex-col justify-between border border-slate-800 text-slate-100">
          <div>
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                  {activeDetail ? activeDetail.title : "System Overview"}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold font-mono tracking-wide">
                  {activeDetail ? activeDetail.subtitle : globalSummary.title}
                </p>
              </div>
              {activeDetail && (
                <button 
                  onClick={() => setSelectedNode(null)} 
                  className="text-slate-500 hover:text-slate-200 transition-colors text-[10px] font-bold uppercase tracking-wider border border-white/5 px-2 py-1 rounded bg-slate-900/55"
                >
                  Clear
                </button>
              )}
            </div>

            <hr className="border-white/5 my-4" />

            {activeDetail ? (
              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-white/5">
                  <span className="text-slate-400 font-medium">Logistics Status</span>
                  <span className={`font-bold ${activeDetail.statusColor} text-[10px] uppercase font-mono tracking-wider`}>
                    {activeDetail.status}
                  </span>
                </div>

                <div className="space-y-2 bg-slate-950/20 p-3 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Physical Specifications</p>
                  {activeDetail.stats.map((s: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                      <span className="text-slate-400">{s.label}</span>
                      <span className="font-mono font-bold text-slate-200">{s.value}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-950/20 p-3 rounded-xl border border-white/5 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Info size={10} /> Operational Diagnostics
                  </p>
                  <p className="text-[10px] leading-relaxed text-slate-450 italic">
                    {activeDetail.details}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <p className="text-[11px] leading-relaxed text-slate-450 font-medium">
                  Hover or click on any node, supply route, or vessel to inspect real-time logistics payloads, coordinates, and active simulations.
                </p>

                <div className="space-y-2.5 bg-slate-950/30 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Activity size={12} className="text-emerald-400" /> Active Tanker Fleets
                  </p>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Total in Transit</span>
                    <span className="font-mono font-bold text-slate-100">{globalSummary.totalActiveVessels} Vessels</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Total Transiting Volume</span>
                    <span className="font-mono font-bold text-emerald-400">{safeFixed(globalSummary.totalCargoVolume / 1000000, 1)}M Barrels</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Threat Alerts (Blocked)</span>
                    <span className={`font-mono font-bold ${globalSummary.blockedVessels > 0 ? "text-red-400 animate-pulse" : "text-slate-400"}`}>
                      {globalSummary.blockedVessels} Vessels
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 bg-slate-950/30 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Database size={12} className="text-indigo-400" /> Strategic Stockpile Summary
                  </p>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">SPR Fill Percentage</span>
                    <span className="font-mono font-bold text-indigo-400">{globalSummary.fillPercent}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">System Mode</span>
                    <span className={`font-mono font-bold ${isDisrupted ? "text-red-400" : "text-emerald-400"}`}>
                      {isDisrupted ? "Disrupted" : "Baseline"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wide font-mono">
            <span className={`w-2 h-2 rounded-full ${isDisrupted ? "bg-red-400" : "bg-emerald-400"} animate-pulse`}></span>
            <span>Digital Twin Feed • Live</span>
          </div>
        </div>

      </div>
    </div>
  );
}
