import React, { useState } from "react";
import {
  Siren,
  Hospital,
  TrafficCone,
  LayoutGrid,
  Volume2,
  VolumeX,
  Radio,
  Activity,
  ShieldAlert,
  Flame
} from "lucide-react";
import { soundEffects } from "../services/audio";

export default function Navbar({
  activeTab,
  setActiveTab,
  isConnected,
  activeTripsCount = 0,
  alertedJunctionsCount = 0
}) {
  const [isMuted, setIsMuted] = useState(false);

  const toggleSound = () => {
    const muted = soundEffects.toggleMute();
    setIsMuted(muted);
  };

  const navItems = [
    {
      id: "ambulance",
      label: "Ambulance Cockpit",
      icon: Siren,
      path: "/ambulance",
      badge: null
    },
    {
      id: "hospital",
      label: "Hospital ER",
      icon: Hospital,
      path: "/hospital",
      badge: activeTripsCount > 0 ? activeTripsCount : null,
      badgeColor: "bg-red-500 text-white"
    },
    {
      id: "traffic",
      label: "Traffic Command",
      icon: TrafficCone,
      path: "/traffic",
      badge: alertedJunctionsCount > 0 ? alertedJunctionsCount : null,
      badgeColor: "bg-amber-500 text-slate-950 font-bold"
    },
    {
      id: "split",
      label: "Split-Screen Demo",
      icon: LayoutGrid,
      path: "/split",
      badge: "LIVE"
    }
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => setActiveTab("ambulance")}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-900/40 group-hover:scale-105 transition-transform">
            <Siren className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                ClearPath
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                Chandigarh Emergency Grid
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Rapid Response Green-Corridor System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  soundEffects.init();
                  setActiveTab(item.id);
                }}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-900/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span className="hidden md:inline">{item.label}</span>
                <span className="md:hidden">
                  {item.id === "ambulance"
                    ? "Ambulance"
                    : item.id === "hospital"
                    ? "Hospital"
                    : item.id === "traffic"
                    ? "Traffic"
                    : "Split"}
                </span>

                {item.badge !== null && item.badge !== undefined && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold animate-pulse ${
                      item.badgeColor || "bg-red-500 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right Status & Sound Controls */}
        <div className="flex items-center gap-3">
          {/* Socket Connection Status */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-400 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-[11px] font-mono text-slate-400">
              {isConnected ? "SOCKET LIVE" : "DISCONNECTED"}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            title={isMuted ? "Unmute Audio Alerts" : "Mute Audio Alerts"}
            className={`p-2 rounded-xl border transition-colors ${
              isMuted
                ? "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                : "bg-red-950/40 border-red-800/40 text-red-400 hover:bg-red-900/50"
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-bounce" />}
          </button>
        </div>
      </div>
    </header>
  );
}
