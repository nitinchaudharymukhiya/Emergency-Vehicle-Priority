import React, { useState, useEffect } from "react";
import {
  TrafficCone,
  Siren,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Clock,
  Milestone,
  Zap,
  Volume2,
  RefreshCw,
  Eye,
  Sliders
} from "lucide-react";
import MapComponent from "../components/MapComponent";
import { SAMPLE_HOSPITALS, SAMPLE_JUNCTIONS } from "../data/constants";
import { socket } from "../services/socket";
import { soundEffects } from "../services/audio";

export default function TrafficPage({
  hospitals = SAMPLE_HOSPITALS,
  junctions = SAMPLE_JUNCTIONS,
  activeTrips = []
}) {
  const [trafficJunctions, setTrafficJunctions] = useState(junctions);
  const [activeAmbulanceTrips, setActiveAmbulanceTrips] = useState(activeTrips);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState("all");
  const [alertLogs, setAlertLogs] = useState([]);

  // Connect to traffic control room
  useEffect(() => {
    soundEffects.init();
    socket.emit("join:traffic");

    const onInitialState = ({ activeTrips, junctions }) => {
      setActiveAmbulanceTrips(activeTrips || []);
      setTrafficJunctions(junctions || []);
    };

    const onTripStarted = ({ trip, junctions, alerts }) => {
      soundEffects.playTrafficAlert();
      setActiveAmbulanceTrips((prev) => {
        const filtered = prev.filter((t) => t.id !== trip.id);
        return [trip, ...filtered];
      });
      if (junctions) setTrafficJunctions(junctions);

      if (alerts && alerts.length > 0) {
        setAlertLogs((prev) => [...alerts, ...prev].slice(0, 20));
      }
    };

    const onTelemetry = ({ tripId, ambulanceId, currentLocation, distanceRemainingKm, etaFormatted, newAlerts, junctions }) => {
      setActiveAmbulanceTrips((prev) =>
        prev.map((t) => {
          if (t.id === tripId) {
            return {
              ...t,
              currentLocation,
              distanceRemainingKm,
              etaFormatted
            };
          }
          return t;
        })
      );

      if (junctions) {
        setTrafficJunctions(junctions);
      }

      if (newAlerts && newAlerts.length > 0) {
        soundEffects.playTrafficAlert();
        setAlertLogs((prev) => [...newAlerts, ...prev].slice(0, 20));
      }
    };

    const onJunctionStatusUpdated = ({ junction, junctions, message }) => {
      if (junctions) {
        setTrafficJunctions(junctions);
      } else if (junction) {
        setTrafficJunctions((prev) =>
          prev.map((j) => (j.id === junction.id ? junction : j))
        );
      }
    };

    const onTripEnded = ({ trip, junctions }) => {
      setActiveAmbulanceTrips((prev) => prev.filter((t) => t.id !== trip.id));
      if (junctions) setTrafficJunctions(junctions);
    };

    socket.on("traffic:initial_state", onInitialState);
    socket.on("traffic:trip_started", onTripStarted);
    socket.on("traffic:telemetry", onTelemetry);
    socket.on("junction:status_updated", onJunctionStatusUpdated);
    socket.on("traffic:trip_ended", onTripEnded);

    return () => {
      socket.off("traffic:initial_state", onInitialState);
      socket.off("traffic:trip_started", onTripStarted);
      socket.off("traffic:telemetry", onTelemetry);
      socket.off("junction:status_updated", onJunctionStatusUpdated);
      socket.off("traffic:trip_ended", onTripEnded);
    };
  }, []);

  // Action: Acknowledge & Clear Junction (Trigger Green Wave)
  const handleClearJunction = (junctionId, tripId) => {
    soundEffects.playJunctionClearedChime();
    socket.emit("junction:clear", {
      junctionId,
      tripId,
      clearedBy: "Traffic Command Officer #4"
    });
  };

  // Action: Reset Junction to clear/normal
  const handleResetJunction = (junctionId) => {
    socket.emit("junction:reset", { junctionId });
  };

  // Filter junctions by active alert
  const alertJunctions = trafficJunctions.filter((j) => j.status === "alert");
  const clearedJunctions = trafficJunctions.filter((j) => j.status === "cleared");

  // Selected route coordinates to display
  const selectedTrip =
    selectedAmbulanceId === "all"
      ? activeAmbulanceTrips[0]
      : activeAmbulanceTrips.find((t) => t.id === selectedAmbulanceId);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-950/50">
            <TrafficCone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Kannur City Traffic Command & Green Wave Center
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                TACTICAL RADAR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated 2 km junction proximity alerting & instant green wave signal overrides
            </p>
          </div>
        </div>

        {/* Action summary */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <span>{alertJunctions.length} Junction Alerts</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300 font-mono">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>{clearedJunctions.length} Green Waves Active</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Control Panel (5 Cols) + Tactical Map (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Proximity Alert Feed & Junction Override Console */}
        <div className="lg:col-span-5 space-y-5">
          {/* Active Proximity Clearance Feed (High Priority) */}
          <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white">
                  Approaching Junction Alerts ({alertJunctions.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                &lt; 2.0 KM THRESHOLD
              </span>
            </div>

            {alertJunctions.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <p className="text-xs font-semibold text-white">All Corridor Junctions Normal</p>
                <p className="text-[11px] text-slate-400">
                  When an active ambulance enters within 2 km of an intersection, a red priority alert will sound here with a one-click Green Wave clearance trigger.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alertJunctions.map((junc) => (
                  <div
                    key={junc.id}
                    className="p-4 rounded-xl bg-red-950/80 border-2 border-red-500 shadow-xl shadow-red-950/60 space-y-3 animate-pulse"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                          <h3 className="font-extrabold text-sm text-white">{junc.name}</h3>
                        </div>
                        <p className="text-xs text-red-200 mt-1 font-semibold">
                          🚨 Ambulance <span className="font-mono text-white">{junc.ambulanceId || "108"}</span> Approaching!
                        </p>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-red-900 text-red-200 border border-red-700">
                        {junc.distanceKm ? `${junc.distanceKm} km` : "Proximity Alert"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-red-200/90 font-mono bg-red-900/40 p-2 rounded-lg">
                      <span>Action Required: Clear Intersection</span>
                      <span>ETA: ~{junc.etaSec ? `${junc.etaSec}s` : "60s"}</span>
                    </div>

                    {/* Acknowledge / Route Cleared (Green Wave) Button */}
                    <button
                      type="button"
                      onClick={() => handleClearJunction(junc.id, junc.activeTripId)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-emerald-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      ACKNOWLEDGE & CLEAR ROUTE (GREEN WAVE)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* All 10 Seeded Junctions Live Monitor */}
          <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200">
                Kannur City Junction Network ({trafficJunctions.length} Points)
              </span>
              <span className="text-[10px] font-mono text-slate-400">Live Telemetry</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {trafficJunctions.map((junc) => {
                const isAlert = junc.status === "alert";
                const isCleared = junc.status === "cleared";

                return (
                  <div
                    key={junc.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                      isAlert
                        ? "bg-red-950/50 border-red-500/50 text-red-200"
                        : isCleared
                        ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
                        : "bg-slate-900/60 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isAlert
                            ? "bg-red-500 animate-ping"
                            : isCleared
                            ? "bg-emerald-400"
                            : "bg-slate-600"
                        }`}
                      />
                      <div>
                        <span className="font-bold text-white block">{junc.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {isAlert
                            ? `⚠️ Priority clearance for ${junc.ambulanceId || "Ambulance"}`
                            : isCleared
                            ? `✅ Green wave active (Cleared)`
                            : "Normal Traffic Flow"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCleared ? (
                        <button
                          type="button"
                          onClick={() => handleResetJunction(junc.id)}
                          title="Reset back to standard traffic pattern"
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 transition-colors"
                        >
                          Reset
                        </button>
                      ) : isAlert ? (
                        <button
                          type="button"
                          onClick={() => handleClearJunction(junc.id, junc.activeTripId)}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white shadow transition-colors"
                        >
                          Clear
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleClearJunction(junc.id, null)}
                          className="px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-white"
                        >
                          Manual Clear
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Full Tactical Live Map (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="h-[580px] relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <MapComponent
              center={[11.8745, 75.3704]}
              zoom={13}
              ambulances={activeAmbulanceTrips}
              hospitals={hospitals}
              junctions={trafficJunctions}
              activeRoute={selectedTrip?.route || []}
            />

            {/* Map Top Floating Overlay */}
            <div className="absolute top-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 shadow-xl flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-white font-mono">TRAFFIC RADAR LIVE</span>
              </div>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 font-mono">
                {activeAmbulanceTrips.length} Active Corridors
              </span>
            </div>

            {/* Map Legend Floating */}
            <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md p-2.5 rounded-xl border border-slate-800 shadow-xl text-[11px] space-y-1">
              <div className="font-bold text-slate-300 mb-1">Signal Legend:</div>
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Approaching Emergency (&lt; 2 km)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Green Wave Cleared</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-600" />
                <span>Normal Signal Flow</span>
              </div>
            </div>
          </div>

          {/* Alert Log Feed */}
          {alertLogs.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Recent Broadcast Logs</span>
              <div className="space-y-1 text-xs font-mono text-slate-400 max-h-24 overflow-y-auto">
                {alertLogs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 py-0.5 border-b border-slate-800/40">
                    <span className="text-amber-400">⚡</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
