"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, CircleMarker } from "react-leaflet";
import L from "leaflet";
import { useSimulation } from "@/context/SimulationContext";
import { getInfrastructure, getRoutes, getShipments } from "@/lib/api";

// Fix Leaflet marker icon asset path issues in Next.js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Map() {
  const { runData } = useSimulation();
  const [infra, setInfra] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  // Fetch baseline static data
  useEffect(() => {
    async function loadStaticData() {
      try {
        const infrastructureData = await getInfrastructure();
        const routesData = await getRoutes();
        setInfra(infrastructureData);
        setRoutes(routesData);
      } catch (e) {
        console.error("Error loading infrastructure static data:", e);
      }
    }
    loadStaticData();
  }, []);

  // Poll shipments coordinates dynamically every 3 seconds for real-time AIS updates
  useEffect(() => {
    let active = true;
    async function pollShipments() {
      try {
        const shipmentsData = await getShipments();
        if (active) {
          setShipments(shipmentsData);
        }
      } catch (e) {
        console.error("Error polling shipments:", e);
      }
    }
    
    pollShipments();
    const interval = setInterval(pollShipments, 3000);
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Determine active layers (from simulation run or baseline defaults)
  const isDisrupted = runData?.digital_twin?.result?.scenario_comparison?.is_disrupted ?? false;
  const activeAlerts = runData?.digital_twin?.result?.geospatial_layers?.alert_zones ?? [];

  // 1. Nodes styling
  const getRefineryIcon = (id: string) => {
    let color = "bg-blue-500";
    let pulse = "";
    if (isDisrupted) {
      const runRates = runData?.scenario_modeller?.result?.refinery_run_rates ?? {};
      const rate = runRates[id]?.projected_utilization ?? 100;
      if (rate < 80) {
        color = "bg-red-500";
        pulse = "animate-ping opacity-75";
      } else if (rate < 95) {
        color = "bg-amber-500";
      }
    }
    return L.divIcon({
      html: `
        <div class="relative w-7 h-7 flex items-center justify-center">
          <span class="absolute w-full h-full rounded-full ${color} ${pulse}"></span>
          <div class="relative w-6 h-6 rounded-full ${color} border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-100 shadow-md">
            R
          </div>
        </div>
      `,
      className: "",
      iconSize: [28, 28],
    });
  };

  const getSupplierIcon = (id: string) => {
    let color = "bg-orange-500";
    if (isDisrupted) {
      const probabilities = runData?.risk_agent?.result?.disruption_probability_by_supplier ?? {};
      const prob = probabilities[id] ?? 0;
      if (prob > 0.7) {
        color = "bg-red-500";
      }
    }
    return L.divIcon({
      html: `<div class="w-6 h-6 rounded-md ${color} border-2 border-slate-900 flex items-center justify-center text-[9px] font-black text-slate-100 shadow-md">S</div>`,
      className: "",
      iconSize: [24, 24],
    });
  };

  const getSprIcon = (id: string) => {
    let color = "bg-violet-500";
    let border = "border-slate-900";
    let pulse = "";
    if (isDisrupted) {
      const drawdown = runData?.spr_optimisation?.result?.drawdown_schedule ?? [];
      const isDrawing = drawdown.some((d: any) => d.spr_id === id);
      if (isDrawing) {
        color = "bg-emerald-400";
        border = "border-emerald-950";
        pulse = "animate-ping opacity-75";
      }
    }
    return L.divIcon({
      html: `
        <div class="relative w-7 h-7 flex items-center justify-center">
          <span class="absolute w-full h-full rounded-full ${color} ${pulse}"></span>
          <div class="relative w-6 h-6 rounded-full ${color} border-2 ${border} flex items-center justify-center text-[9px] font-black text-slate-950 shadow-md">
            SPR
          </div>
        </div>
      `,
      className: "",
      iconSize: [28, 28],
    });
  };

  const getVesselIcon = (status: string) => {
    let color = "bg-sky-400";
    let pulse = "animate-pulse";
    if (status === "BLOCKED") {
      color = "bg-red-500";
      pulse = "animate-ping";
    } else if (status === "REROUTED") {
      color = "bg-amber-400";
    }
    return L.divIcon({
      html: `
        <div class="relative w-6 h-6 flex items-center justify-center">
          <span class="absolute w-4 h-4 rounded-full ${color} ${pulse} opacity-60"></span>
          <div class="w-3.5 h-3.5 rounded-full ${color} border border-slate-900 shadow-md"></div>
        </div>
      `,
      className: "",
      iconSize: [24, 24],
    });
  };

  if (!infra) {
    return (
      <div className="w-full h-[550px] bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-medium">Loading Geospatial Digital Twin Map Layers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[550px] rounded-2xl overflow-hidden shadow-2xl border border-slate-800 dark-map">
      <MapContainer 
        center={[20.0, 55.0]} 
        zoom={3.5} 
        scrollWheelZoom={true} 
        preferCanvas={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Routes (Polyline Pathing) */}
        {routes.map((route) => {
          if (!route.geometry || !route.geometry.coordinates) return null;
          
          // Swap coordinates (GeoJSON uses [lon, lat] but Leaflet expects [lat, lon])
          const coords = route.geometry.coordinates.map((pt: number[]) => [pt[1], pt[0]]);
          
          let color = "#10b981"; // Safe Green
          let dash = undefined;
          let weight = 3;

          if (isDisrupted) {
            const routesLayer = runData?.digital_twin?.result?.geospatial_layers?.routes_layer ?? [];
            const rState = routesLayer.find((rl: any) => rl.id === route.id);
            if (rState) {
              if (rState.type === "BLOCKED") {
                color = "#ef4444"; // Red
                dash = "10, 10";
              } else if (rState.type === "ALTERNATIVE") {
                color = "#38bdf8"; // Sky Blue
                dash = "5, 5";
                weight = 4;
              }
            }
          }

          return (
            <Polyline
              key={route.id}
              positions={coords}
              color={color}
              weight={weight}
              dashArray={dash}
              opacity={0.8}
            >
              <Popup>
                <div className="text-xs text-slate-200 p-1 space-y-0.5">
                  <p className="font-bold text-white text-sm border-b border-white/10 pb-1 mb-1">{route.id.replace("RT_", "").replace("_", " ➔ ")}</p>
                  <p>Transit: <span className="font-semibold text-slate-100">{route.transit_time_days} days</span></p>
                  <p>Chokepoint: <span className="font-semibold text-slate-100">{route.transit_chokepoint}</span></p>
                  <p>Status: <span className="font-bold" style={{ color }}>{route.status}</span></p>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* 2. Refineries (Marker Nodes) */}
        {infra.refineries.map((ref: any) => (
          <Marker 
            key={ref.id} 
            position={[ref.latitude, ref.longitude]} 
            icon={getRefineryIcon(ref.id)}
          >
            <Popup>
              <div className="text-xs text-slate-200 p-1 space-y-1">
                <p className="font-bold text-sm text-white border-b border-white/10 pb-1 mb-1">{ref.name}</p>
                <p>Capacity: <b className="text-slate-100">{(ref.capacity_bpd / 1000).toFixed(0)}k bpd</b></p>
                <p>Crude Grades: <i className="text-slate-350">{ref.crude_compatibility}</i></p>
                <p>Current Inventory: <b className="text-slate-100">{(ref.current_inventory_barrels / 1000000).toFixed(1)}M barrels</b></p>
                {isDisrupted && (
                  <div className="border-t border-white/10 mt-1.5 pt-1.5 text-emerald-400 font-semibold space-y-0.5">
                    <p>Proj. Run Rate: {runData?.scenario_modeller?.result?.refinery_run_rates[ref.id]?.projected_utilization ?? 100}%</p>
                    <p>Days-to-Stockout: {runData?.scenario_modeller?.result?.refinery_days_to_stockout[ref.id] ?? "Safe"} days</p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 3. Suppliers (Marker Nodes) */}
        {infra.suppliers.map((sup: any) => (
          <Marker 
            key={sup.id} 
            position={[sup.port_latitude, sup.port_longitude]} 
            icon={getSupplierIcon(sup.id)}
          >
            <Popup>
              <div className="text-xs text-slate-200 p-1 space-y-0.5">
                <p className="font-bold text-sm text-white border-b border-white/10 pb-1 mb-1">{sup.name}</p>
                <p>Region: <b className="text-slate-100">{sup.region}</b></p>
                <p>Export Grade: <b className="text-slate-100">{sup.crude_grade}</b></p>
                <p>Max Export: <b className="text-slate-100">{(sup.max_export_capacity_bpd / 1000000).toFixed(1)}M bpd</b></p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 4. SPR Inventory Caverns (Marker Nodes) */}
        {infra.spr_inventory.map((spr: any) => (
          <Marker 
            key={spr.id} 
            position={[spr.latitude, spr.longitude]} 
            icon={getSprIcon(spr.id)}
          >
            <Popup>
              <div className="text-xs text-slate-200 p-1 space-y-1">
                <p className="font-bold text-sm text-white border-b border-white/10 pb-1 mb-1">SPR {spr.location}</p>
                <p>Capacity: <b className="text-slate-100">{(spr.capacity_barrels / 1000000).toFixed(1)}M barrels</b></p>
                <p>Current Inventory: <b className="text-slate-100">{(spr.current_inventory_barrels / 1000000).toFixed(1)}M barrels</b></p>
                <p>Max Drawdown: <b className="text-slate-100">{(spr.max_drawdown_bpd / 1000).toFixed(0)}k bpd</b></p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 5. Transiting Vessels (Canvas CircleMarker) */}
        {shipments.map((ship) => {
          let lat = ship.current_latitude;
          let lng = ship.current_longitude;
          let status = ship.current_status;

          // If disrupted, overlay the new visual status
          if (isDisrupted) {
            const vesselsLayer = runData?.digital_twin?.result?.geospatial_layers?.vessels_layer ?? [];
            const vState = vesselsLayer.find((vl: any) => vl.name === ship.vessel_name);
            if (vState) {
              status = vState.status;
              // Add slight random offset if coordinates are null
              if (!lat) {
                lat = 12.0 + Math.random() * 5;
                lng = 62.0 + Math.random() * 5;
              }
            }
          }

          if (!lat || !lng || status === "COMPLETED") return null;

          let color = "#38bdf8"; // Sky Blue
          if (status === "BLOCKED") {
            color = "#ef4444"; // Red
          } else if (status === "REROUTED") {
            color = "#fbbf24"; // Amber
          }

          return (
            <CircleMarker 
              key={ship.id} 
              center={[lat, lng]} 
              radius={5}
              fillColor={color}
              color="#0f172a"
              weight={1.5}
              fillOpacity={0.95}
            >
              <Popup>
                <div className="text-xs text-slate-200 p-1 space-y-0.5">
                  <p className="font-bold text-sm text-white border-b border-white/10 pb-1 mb-1">{ship.vessel_name} ({ship.vessel_type})</p>
                  <p>Cargo: <b className="text-slate-100">{(ship.volume_barrels / 1000000).toFixed(1)}M barrels</b></p>
                  <p>Status: <span className="font-bold text-sky-400" style={{ color }}>{status}</span></p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* 6. Alert Zones (Geopolitical Threats overlay) */}
        {activeAlerts.map((zone: any, idx: number) => (
          <Circle
            key={idx}
            center={[zone.lat, zone.lng]}
            radius={zone.radius}
            pathOptions={{ fillColor: "red", color: "red", fillOpacity: 0.15 }}
          >
            <Popup>
              <div className="text-xs text-slate-200 p-1 space-y-0.5">
                <p className="font-bold text-sm text-red-400 border-b border-red-950/20 pb-1 mb-1">Active Alert Zone: {zone.name}</p>
                <p>Threat Probability: <b className="text-slate-100">{(zone.probability * 100).toFixed(0)}%</b></p>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
