"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Compass, 
  Database, 
  History, 
  Home, 
  LineChart, 
  ShieldAlert, 
  Activity,
  Building2,
  Library,
  Key
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [showKeys, setShowKeys] = useState(false);
  const [geminiKey, setGeminiKey] = useState("");
  const [nvidiaKey, setNvidiaKey] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGeminiKey(localStorage.getItem("GEMINI_API_KEY") || "");
      setNvidiaKey(localStorage.getItem("NVIDIA_API_KEY") || "");
    }
  }, []);

  const handleSaveKeys = () => {
    localStorage.setItem("GEMINI_API_KEY", geminiKey);
    localStorage.setItem("NVIDIA_API_KEY", nvidiaKey);
    alert("API Keys saved successfully! INDRA will now use your custom keys.");
    setShowKeys(false);
  };

  const handleClearKeys = () => {
    localStorage.removeItem("GEMINI_API_KEY");
    localStorage.removeItem("NVIDIA_API_KEY");
    setGeminiKey("");
    setNvidiaKey("");
    alert("Custom API Keys cleared. The system will fall back to server-side defaults.");
    setShowKeys(false);
  };

  const menuItems = [
    { name: "Control Center", href: "/", icon: Home },
    { name: "Asset Directory", href: "/infrastructure", icon: Building2 },
    { name: "Intel Briefings", href: "/briefings", icon: Library },
    { name: "Risk Analyst", href: "/risk", icon: ShieldAlert },
    { name: "Scenario Modeller", href: "/scenario", icon: LineChart },
    { name: "Sourcing & Logistics", href: "/procurement", icon: Compass },
    { name: "Strategic Reserves", href: "/spr", icon: Database },
    { name: "Audit Archives", href: "/runs", icon: History },
  ];

  return (
    <aside className="w-64 sidebar-glass text-slate-100 flex flex-col h-screen fixed left-0 top-0 z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3">
        <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-emerald-400">
          <Activity size={20} className="animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none tracking-wide bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            INDRA
          </h1>
          <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
            Energy Security Twin
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-emerald-500/10 to-teal-500/5 text-emerald-400 border border-emerald-500/20 shadow-lg shadow-emerald-500/5"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <Icon
                size={18}
                className={`transition-colors duration-200 ${
                  isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-300"
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <button 
            onClick={() => setShowKeys(!showKeys)} 
            className="flex items-center gap-1 hover:text-emerald-400 text-slate-400 font-medium transition-colors"
          >
            <Key size={14} />
            <span>API Keys</span>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-emerald-400 font-semibold">ONLINE</span>
          </div>
        </div>

        {showKeys && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-2.5 animate-in slide-in-from-bottom-2 duration-200">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Gemini API Key</label>
              <input
                type="password"
                placeholder="Auto (Server Default)"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">NVIDIA API Key</label>
              <input
                type="password"
                placeholder="Auto (Server Default)"
                value={nvidiaKey}
                onChange={(e) => setNvidiaKey(e.target.value)}
                className="w-full bg-slate-950/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveKeys}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold py-1.5 rounded-lg transition-colors"
              >
                Save
              </button>
              {(geminiKey || nvidiaKey) && (
                <button
                  onClick={handleClearKeys}
                  className="px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold py-1.5 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
