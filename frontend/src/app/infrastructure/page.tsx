"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { getInfrastructure } from "@/lib/api";
import { Building2, Database, Globe, Search, PlusCircle, ArrowDownCircle, Percent, GitBranch } from "lucide-react";
import KnowledgeGraph from "@/components/KnowledgeGraph";

const safeLower = (val: any) => (val ? String(val).toLowerCase() : "");
const safeFixed = (val: any, decimals = 4) => {
  const num = Number(val);
  return isNaN(num) ? "0.0000" : num.toFixed(decimals);
};

export default function InfrastructurePage() {
  const [infra, setInfra] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState<"refineries" | "sprs" | "suppliers" | "graph">("refineries");

  useEffect(() => {
    async function loadInfra() {
      try {
        const data = await getInfrastructure();
        setInfra(data);
      } catch (e) {
        console.error("Failed to load infrastructure data", e);
      } finally {
        setLoading(false);
      }
    }
    loadInfra();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 font-medium">Querying National Infrastructure Directory...</p>
        </div>
      </div>
    );
  }

  // Fallbacks if data is missing or empty
  const refineries = infra?.refineries ?? [];
  const suppliers = infra?.suppliers ?? [];
  const sprs = infra?.spr_inventory ?? [];

  // Filter based on search query
  const filteredRefineries = refineries.filter((r: any) =>
    safeLower(r.name).includes(searchQuery.toLowerCase()) ||
    safeLower(r.id).includes(searchQuery.toLowerCase()) ||
    safeLower(r.crude_compatibility).includes(searchQuery.toLowerCase())
  );

  const filteredSprs = sprs.filter((s: any) =>
    safeLower(s.location).includes(searchQuery.toLowerCase()) ||
    safeLower(s.id).includes(searchQuery.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter((s: any) =>
    safeLower(s.name).includes(searchQuery.toLowerCase()) ||
    safeLower(s.id).includes(searchQuery.toLowerCase()) ||
    safeLower(s.region).includes(searchQuery.toLowerCase()) ||
    safeLower(s.crude_grade).includes(searchQuery.toLowerCase())
  );

  // Aggregated Stats
  const totalRefiningCapacity = refineries.reduce((sum: number, r: any) => sum + (r.capacity_bpd || 0), 0);
  const totalSprCapacity = sprs.reduce((sum: number, s: any) => sum + (s.capacity_barrels || 0), 0);
  const totalSprInventory = sprs.reduce((sum: number, s: any) => sum + (s.current_inventory_barrels || 0), 0);
  const totalSupplierExportCapacity = suppliers.reduce((sum: number, s: any) => sum + (s.max_export_capacity_bpd || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 font-sans">National Energy Infrastructure Directory</h1>
          <p className="text-slate-400 text-sm mt-1">Global supply hubs, refining capacities, and strategic petroleum stockpiles</p>
        </div>

        {/* Search */}
        {activeSection !== "graph" && (
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search assets, grades, regions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-350 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Grid: Stat Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total refining */}
        <div
          onClick={() => setActiveSection("refineries")}
          className={`glass-panel rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
            activeSection === "refineries"
              ? "ring-2 ring-emerald-500 bg-emerald-500/5 border-emerald-500/30"
              : "glass-panel-hover border-slate-800"
          }`}
          title="Click to view Refining Assets"
        >
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Refining Capacity</span>
            <Building2 size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight">{(totalRefiningCapacity / 1000000).toFixed(2)}M</span>
            <span className="text-xs text-slate-500 font-semibold">bpd</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Active domestic refineries registered</p>
        </div>

        {/* Total SPR capacity */}
        <div
          onClick={() => setActiveSection("sprs")}
          className={`glass-panel rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
            activeSection === "sprs"
              ? "ring-2 ring-indigo-500 bg-indigo-500/5 border-indigo-500/30"
              : "glass-panel-hover-indigo border-slate-800"
          }`}
          title="Click to view Strategic Petroleum Caverns"
        >
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Strategic Reserves Cap</span>
            <Database size={16} className="text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight">{(totalSprCapacity / 1000000).toFixed(1)}M</span>
            <span className="text-xs text-slate-500 font-semibold">Barrels</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Emergency underground caverns capacity</p>
        </div>

        {/* Total SPR stockpile */}
        <div
          onClick={() => setActiveSection("sprs")}
          className={`glass-panel rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
            activeSection === "sprs"
              ? "ring-2 ring-indigo-500 bg-indigo-500/5 border-indigo-500/30"
              : "glass-panel-hover border-slate-800"
          }`}
          title="Click to view Strategic Petroleum Caverns"
        >
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Strategic Stockpile</span>
            <ArrowDownCircle size={16} className="text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight">{(totalSprInventory / 1000000).toFixed(1)}M</span>
            <span className="text-xs text-slate-500 font-semibold">Barrels</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Average Fill level: {totalSprCapacity ? ((totalSprInventory / totalSprCapacity) * 100).toFixed(0) : 0}%
          </p>
        </div>

        {/* Total supplier capacity */}
        <div
          onClick={() => setActiveSection("suppliers")}
          className={`glass-panel rounded-2xl p-5 cursor-pointer transition-all duration-200 ${
            activeSection === "suppliers"
              ? "ring-2 ring-amber-500 bg-amber-500/5 border-amber-500/30"
              : "glass-panel-hover-amber border-slate-800"
          }`}
          title="Click to view Global Supply Nodes"
        >
          <div className="flex justify-between items-center text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Suppliers Export Cap</span>
            <Globe size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black tracking-tight">{(totalSupplierExportCapacity / 1000000).toFixed(1)}M</span>
            <span className="text-xs text-slate-500 font-semibold">bpd</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Global baseline shipping capacity</p>
        </div>
      </div>

      {/* Selector Tabs */}
      <div className="border-b border-slate-800 flex gap-2">
        <button
          onClick={() => setActiveSection("refineries")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            activeSection === "refineries"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-500 hover:text-slate-350 hover:bg-slate-900/40"
          }`}
        >
          <Building2 size={14} />
          <span>Refining Assets ({filteredRefineries.length})</span>
        </button>
        <button
          onClick={() => setActiveSection("sprs")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            activeSection === "sprs"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-500 hover:text-slate-350 hover:bg-slate-900/40"
          }`}
        >
          <Database size={14} />
          <span>Strategic Petroleum Caverns ({filteredSprs.length})</span>
        </button>
        <button
          onClick={() => setActiveSection("suppliers")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            activeSection === "suppliers"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-500 hover:text-slate-350 hover:bg-slate-900/40"
          }`}
        >
          <Globe size={14} />
          <span>Global Supply Nodes ({filteredSuppliers.length})</span>
        </button>
        <button
          onClick={() => setActiveSection("graph")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs tracking-wider uppercase transition-all duration-200 cursor-pointer ${
            activeSection === "graph"
              ? "border-purple-500 text-purple-400 bg-purple-500/5"
              : "border-transparent text-slate-500 hover:text-slate-350 hover:bg-slate-900/40"
          }`}
        >
          <GitBranch size={14} />
          <span>Network Knowledge Graph</span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeSection === "graph" ? (
        <KnowledgeGraph />
      ) : (
        <div className="glass-panel rounded-3xl p-6">
          {/* Section 1: Refineries */}
          {activeSection === "refineries" && (
            <div className="overflow-x-auto">
              {filteredRefineries.length > 0 ? (
                <table className="w-full text-sm text-left text-slate-400">
                  <thead className="text-xs uppercase bg-slate-950/40 text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Refinery Name</th>
                      <th className="px-6 py-3.5 font-semibold">Refinery ID</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Capacity (bpd)</th>
                      <th className="px-6 py-3.5 font-semibold">Crude Compatibility</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Current Inventory</th>
                      <th className="px-6 py-3.5 font-semibold text-center">Coordinates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRefineries.map((ref: any) => (
                      <tr key={ref.id} className="hover:bg-slate-850/20 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-200">{ref.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400 font-bold">{ref.id}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-200">
                          {ref.capacity_bpd ? ref.capacity_bpd.toLocaleString() : "0"} bpd
                        </td>
                        <td className="px-6 py-4 text-xs italic text-slate-400 max-w-[200px] truncate" title={ref.crude_compatibility}>
                          {ref.crude_compatibility}
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-xs font-semibold text-slate-350">
                          {ref.current_inventory_barrels ? ref.current_inventory_barrels.toLocaleString() : "0"} Barrels
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-[10px] text-slate-500">
                          [{safeFixed(ref.latitude)}, {safeFixed(ref.longitude)}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <Building2 size={24} className="mx-auto mb-2 text-slate-650" />
                  <p className="text-xs font-semibold">No refineries match your query.</p>
                </div>
              )}
            </div>
          )}

          {/* Section 2: SPRs */}
          {activeSection === "sprs" && (
            <div className="overflow-x-auto">
              {filteredSprs.length > 0 ? (
                <table className="w-full text-sm text-left text-slate-400">
                  <thead className="text-xs uppercase bg-slate-950/40 text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Cavern Location</th>
                      <th className="px-6 py-3.5 font-semibold">Cavern ID</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Total Capacity</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Current Stockpile</th>
                      <th className="px-6 py-3.5 font-semibold">Cavern Fill Level</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Max Drawdown (bpd)</th>
                      <th className="px-6 py-3.5 font-semibold text-center">Coordinates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSprs.map((spr: any) => {
                      const fillPercent = spr.capacity_barrels ? (spr.current_inventory_barrels / spr.capacity_barrels) * 100 : 0;
                      return (
                        <tr key={spr.id} className="hover:bg-slate-850/20 transition-colors">
                          <td className="px-6 py-4 font-bold text-slate-200">SPR {spr.location}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-400 font-bold">{spr.id}</td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-200">
                            {spr.capacity_barrels ? spr.capacity_barrels.toLocaleString() : "0"} Barrels
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs font-semibold text-slate-350">
                            {spr.current_inventory_barrels ? spr.current_inventory_barrels.toLocaleString() : "0"} Barrels
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-850 h-2 rounded-full overflow-hidden border border-slate-800">
                                <div
                                  className="h-full bg-indigo-500 rounded-full transition-all"
                                  style={{ width: `${fillPercent}%` }}
                                />
                              </div>
                              <span className="font-mono text-xs text-indigo-400 font-bold">{fillPercent.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-xs text-emerald-400 font-bold">
                            {spr.max_drawdown_bpd ? spr.max_drawdown_bpd.toLocaleString() : "0"} bpd
                          </td>
                          <td className="px-6 py-4 text-center font-mono text-[10px] text-slate-500">
                            [{safeFixed(spr.latitude)}, {safeFixed(spr.longitude)}]
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <Database size={24} className="mx-auto mb-2 text-slate-650" />
                  <p className="text-xs font-semibold">No strategic caverns match your query.</p>
                </div>
              )}
            </div>
          )}

          {/* Section 3: Suppliers */}
          {activeSection === "suppliers" && (
            <div className="overflow-x-auto">
              {filteredSuppliers.length > 0 ? (
                <table className="w-full text-sm text-left text-slate-400">
                  <thead className="text-xs uppercase bg-slate-950/40 text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">Supplier Name</th>
                      <th className="px-6 py-3.5 font-semibold">Supplier ID</th>
                      <th className="px-6 py-3.5 font-semibold">Export Region</th>
                      <th className="px-6 py-3.5 font-semibold">Crude Grade Grade</th>
                      <th className="px-6 py-3.5 font-semibold text-right">Max Export Cap (bpd)</th>
                      <th className="px-6 py-3.5 font-semibold text-center">Coordinates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredSuppliers.map((sup: any) => (
                      <tr key={sup.id} className="hover:bg-slate-850/20 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-200">{sup.name}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400 font-bold">{sup.id}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-350">{sup.region}</td>
                        <td className="px-6 py-4 text-xs italic text-slate-400">{sup.crude_grade}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-200">
                          {sup.max_export_capacity_bpd ? sup.max_export_capacity_bpd.toLocaleString() : "0"} bpd
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-[10px] text-slate-500">
                          [{safeFixed(sup.port_latitude)}, {safeFixed(sup.port_longitude)}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <Globe size={24} className="mx-auto mb-2 text-slate-650" />
                  <p className="text-xs font-semibold">No global supply nodes match your query.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
