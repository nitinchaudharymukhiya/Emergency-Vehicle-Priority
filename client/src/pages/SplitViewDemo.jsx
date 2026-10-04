import React, { useState, useEffect, useRef } from "react";
import {
  Siren,
  Hospital,
  TrafficCone,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Milestone,
  Layers,
  Sparkles,
  Radio,
  Activity,
  Heart,
  ShieldAlert,
  Sliders,
  ChevronRight,
  Maximize2,
  Volume2
} from "lucide-react";
import MapComponent from "../components/MapComponent";
import {
  CHANDIGARH_CENTER,
  SAMPLE_HOSPITALS,
  SAMPLE_JUNCTIONS,
  PRESET_START_LOCATIONS,
  DEMO_SCENARIOS
} from "../data/constants";
import { fetchOsrmRoute } from "../services/osrm";
import { socket } from "../services/socket";
import { soundEffects } from "../services/audio";
import confetti from "canvas-confetti";

export default function SplitViewDemo({
  hospitals = SAMPLE_HOSPITALS,
  junctions = SAMPLE_JUNCTIONS,
  allTrips = []
}) {
  // Scenario & Controls State
  const [selectedScenario, setSelectedScenario] = useState(DEMO_SCENARIOS[0]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [coordIndex, setCoordIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(2); // 2x default for smooth live demo
  const [autoClearGreenWave, setAutoClearGreenWave] = useState(false);
  const [viewMode, setViewMode] = useState("three-col"); // 'three-col' | 'master-map'

  // Live Synchronized Event Log
  const [eventLogs, setEventLogs] = useState([
    {
      time: new Date().toLocaleTimeString(),
      type: "system",
      text: "ClearPath Chandigarh Emergency Network Initialized. Ready for dispatch."
    }
  ]);

  // Active hospital & junction states
  const [localJunctions, setLocalJunctions] = useState(junctions);
  const [inboundAmbulances, setInboundAmbulances] = useState([]);
  const [arrivedTrips, setArrivedTrips] = useState([]);
  const [alertBanner, setAlertBanner] = useState(null);

  const simTimerRef = useRef(null);

  const addEventLog = (type, text) => {
    setEventLogs((prev) => [
      {
        time: new Date().toLocaleTimeString(),
        type,
        text
      },
      ...prev.slice(0, 30)
    ]);
  };

  // Pre-fetch route for the current scenario
  useEffect(() => {
    let isMounted = true;
    const loadScenarioRoute = async () => {
      const destHospital =
        hospitals.find((h) => h.id === selectedScenario.hospitalId) || hospitals[0];
      const res = await fetchOsrmRoute(selectedScenario.startLocation, {
        lat: destHospital.lat,
        lng: destHospital.lng
      });
      if (isMounted && res.success) {
        setRouteCoordinates(res.coordinates);
      }
    };
    if (!activeTrip) {
      loadScenarioRoute();
    }
    return () => {
      isMounted = false;
    };
  }, [selectedScenario, activeTrip, hospitals]);

  // Listen to Socket.IO events for synchronized updates
  useEffect(() => {
    socket.emit("join:traffic");
    socket.emit("join:hospital", { hospitalId: selectedScenario.hospitalId });

    const onTripCreated = (trip) => {
      setActiveTrip(trip);
      setCoordIndex(0);
      setIsSimulating(true);
      addEventLog("dispatch", `🚨 AMBULANCE ${trip.ambulanceId} DISPATCHED from ${trip.startLocation.name} to ${trip.hospitalName}`);
    };

    const onHospitalTripNew = ({ trip }) => {
      soundEffects.playUrgentSiren();
      setInboundAmbulances((prev) => [trip, ...prev.filter((t) => t.id !== trip.id)]);
      setAlertBanner(`EMERGENCY INBOUND: ${trip.ambulanceId} (${trip.patientCondition})`);
      addEventLog("hospital", `🏥 ${trip.hospitalName} ER received alert for ${trip.ambulanceId}. Trauma Bay 1 assigned.`);
      setTimeout(() => setAlertBanner(null), 8000);
    };

    const onTrafficAlert = ({ trip, alerts }) => {
      if (alerts && alerts.length > 0) {
        soundEffects.playTrafficAlert();
        alerts.forEach((alt) => {
          addEventLog("traffic", `⚠️ 2KM PROXIMITY ALERT: ${trip.ambulanceId} approaching ${alt.junctionName} (ETA ~${alt.etaSec}s)`);
        });

        if (autoClearGreenWave) {
          setTimeout(() => {
            handleClearJunction(alerts[0].junctionId, trip.id);
          }, 1200);
        }
      }
    };

    const onTelemetry = (data) => {
      if (activeTrip && data.tripId === activeTrip.id) {
        setActiveTrip((prev) =>
          prev
            ? {
                ...prev,
                distanceRemainingKm: data.distanceRemainingKm,
                etaFormatted: data.etaFormatted,
                currentLocation: data.currentLocation
              }
            : null
        );
      }
      if (data.junctions) {
        setLocalJunctions(data.junctions);
      }
    };

    const onJunctionUpdated = ({ junction, junctions: updatedJunctions }) => {
      if (updatedJunctions) setLocalJunctions(updatedJunctions);
      if (junction && junction.status === "cleared") {
        soundEffects.playJunctionClearedChime();
        addEventLog("greenwave", `🟢 GREEN WAVE CLEARED: ${junction.name} signal set to GREEN priority.`);
      }
    };

    const onTripArrived = ({ trip, message }) => {
      soundEffects.playArrivalChime();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      setIsSimulating(false);
      setActiveTrip((prev) => (prev ? { ...prev, status: "arrived" } : null));
      setInboundAmbulances((prev) => prev.filter((t) => t.id !== trip.id));
      setArrivedTrips((prev) => [trip, ...prev]);
      addEventLog("arrival", `🎉 ARRIVAL CONFIRMED: ${trip.ambulanceId} safely docked at ${trip.hospitalName} ER!`);
    };

    socket.on("trip:created", onTripCreated);
    socket.on("trip:new", onHospitalTripNew);
    socket.on("traffic:trip_started", onTrafficAlert);
    socket.on("traffic:telemetry", onTelemetry);
    socket.on("junction:status_updated", onJunctionUpdated);
    socket.on("trip:arrived", onTripArrived);

    return () => {
      socket.off("trip:created", onTripCreated);
      socket.off("trip:new", onHospitalTripNew);
      socket.off("traffic:trip_started", onTrafficAlert);
      socket.off("traffic:telemetry", onTelemetry);
      socket.off("junction:status_updated", onJunctionUpdated);
      socket.off("trip:arrived", onTripArrived);
    };
  }, [selectedScenario, activeTrip, autoClearGreenWave]);

  // Launch Current Scenario Trip
  const handleLaunchScenarioTrip = async () => {
    soundEffects.init();
    soundEffects.playUrgentSiren();

    const destHospital =
      hospitals.find((h) => h.id === selectedScenario.hospitalId) || hospitals[0];

    // Ensure route is fetched
    let coords = routeCoordinates;
    if (coords.length === 0) {
      const routeRes = await fetchOsrmRoute(selectedScenario.startLocation, {
        lat: destHospital.lat,
        lng: destHospital.lng
      });
      coords = routeRes.coordinates;
      setRouteCoordinates(coords);
    }

    const payload = {
      ambulanceId: selectedScenario.ambulanceId,
      patientCondition: selectedScenario.patientCondition,
      severity: selectedScenario.severity,
      hospitalId: destHospital.id,
      startLocation: selectedScenario.startLocation,
      route: coords,
      currentLocation: coords[0] || selectedScenario.startLocation,
      notes: "Live Split-Screen Demonstration Mode"
    };

    socket.emit("trip:start", payload);
  };

  // Step simulation loop
  useEffect(() => {
    if (isSimulating && activeTrip && activeTrip.status === "active") {
      if (simTimerRef.current) clearInterval(simTimerRef.current);

      const intervalMs = Math.max(200, 1000 / simSpeed);

      simTimerRef.current = setInterval(() => {
        setCoordIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= routeCoordinates.length) {
            clearInterval(simTimerRef.current);
            setIsSimulating(false);

            const destHospital =
              hospitals.find((h) => h.id === activeTrip.hospitalId) || hospitals[0];
            socket.emit("trip:location_update", {
              tripId: activeTrip.id,
              currentLocation: { lat: destHospital.lat, lng: destHospital.lng },
              remainingRoute: []
            });

            socket.emit("trip:end", {
              tripId: activeTrip.id,
              reason: "Arrived at Chandigarh ER Center"
            });
            return prevIndex;
          }

          const currentPos = routeCoordinates[nextIndex];
          const remainingRouteSlice = routeCoordinates.slice(nextIndex);

          socket.emit("trip:location_update", {
            tripId: activeTrip.id,
            currentLocation: currentPos,
            remainingRoute: remainingRouteSlice
          });

          return nextIndex;
        });
      }, intervalMs);
    } else {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    }

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [isSimulating, activeTrip, routeCoordinates, simSpeed, hospitals]);

  // Traffic Officer Clears Junction (Green Wave)
  const handleClearJunction = (junctionId, tripId) => {
    soundEffects.playJunctionClearedChime();
    socket.emit("junction:clear", {
      junctionId,
      tripId,
      clearedBy: "Traffic Officer (Chandigarh Control)"
    });
  };

  // Reset demo
  const handleResetDemo = () => {
    if (activeTrip) {
      socket.emit("trip:end", {
        tripId: activeTrip.id,
        reason: "Reset by demo operator"
      });
    }
    setActiveTrip(null);
    setCoordIndex(0);
    setIsSimulating(false);
    setInboundAmbulances([]);
    addEventLog("system", "Demo reset. Ready for new mission scenario.");
  };

  const currentAmbulancePos =
    routeCoordinates.length > 0
      ? routeCoordinates[coordIndex] || selectedScenario.startLocation
      : selectedScenario.startLocation;

  const targetHospital =
    hospitals.find((h) => h.id === selectedScenario.hospitalId) || hospitals[0];

  const alertJunctions = localJunctions.filter((j) => j.status === "alert");
  const clearedJunctions = localJunctions.filter((j) => j.status === "cleared");

  return (
    <div className="max-w-[1800px] mx-auto px-3 sm:px-5 py-4 space-y-4">
      {/* Top Demo Command Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-2xl space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Mission Scenarios Picker */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 xl:pb-0">
            <div className="flex items-center gap-2 pr-3 border-r border-slate-800 text-xs font-bold text-slate-300 whitespace-nowrap">
              <Sparkles className="w-4 h-4 text-red-500 animate-pulse" />
              <span>CHANDIGARH SCENARIOS:</span>
            </div>
            {DEMO_SCENARIOS.map((scen) => {
              const isSelected = selectedScenario.id === scen.id;
              return (
                <button
                  key={scen.id}
                  onClick={() => {
                    if (!activeTrip || activeTrip.status === "arrived") {
                      setSelectedScenario(scen);
                    }
                  }}
                  disabled={activeTrip && activeTrip.status === "active"}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                    isSelected
                      ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-950/60 font-bold"
                      : "bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-50"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-white" />
                  <span>{scen.title}</span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons & Simulation Engine Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!activeTrip || activeTrip.status === "arrived" ? (
              <button
                type="button"
                onClick={handleLaunchScenarioTrip}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:brightness-110 text-white font-extrabold text-xs tracking-wider shadow-xl shadow-red-900/60 transition-all flex items-center gap-2 cursor-pointer animate-pulse"
              >
                <Siren className="w-4 h-4" />
                <span>LAUNCH EMERGENCY MISSION</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isSimulating
                      ? "bg-amber-600 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isSimulating ? "Pause" : "Resume"}</span>
                </button>

                {/* Speed Multipliers */}
                <div className="flex items-center gap-1 bg-slate-900 px-1 py-0.5 rounded-lg">
                  {[1, 2, 4, 8].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSimSpeed(s)}
                      className={`px-2 py-1 rounded text-[11px] font-mono font-bold ${
                        simSpeed === s ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleResetDemo}
                  title="Reset mission"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Auto-Clear Green Wave Toggle */}
            <button
              onClick={() => setAutoClearGreenWave(!autoClearGreenWave)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                autoClearGreenWave
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-950"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${autoClearGreenWave ? "text-emerald-400 fill-emerald-400" : ""}`} />
              <span>Auto Green-Wave: {autoClearGreenWave ? "ON" : "OFF"}</span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode("three-col")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  viewMode === "three-col"
                    ? "bg-slate-800 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                3-Panel Cockpit
              </button>
              <button
                onClick={() => setViewMode("master-map")}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  viewMode === "master-map"
                    ? "bg-slate-800 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Master Tactical Map
              </button>
            </div>
          </div>
        </div>

        {/* Live Route Description & Progress Bar */}
        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-mono font-bold">
              {selectedScenario.ambulanceId}
            </span>
            <span className="font-semibold text-white">{selectedScenario.description}</span>
          </div>

          <div className="w-full sm:w-72 flex items-center gap-3">
            <span className="font-mono text-slate-400 text-[11px] whitespace-nowrap">
              {activeTrip?.distanceRemainingKm || "0"} km | {activeTrip?.etaFormatted || "Ready"}
            </span>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500 h-full transition-all duration-300"
                style={{
                  width: `${
                    routeCoordinates.length > 0
                      ? Math.min(100, (coordIndex / (routeCoordinates.length - 1)) * 100)
                      : 0
                  }%`
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: THREE-PANEL COCKPIT (Ambulance | Hospital ER | Traffic Control) */}
      {viewMode === "three-col" ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* PANEL 1: AMBULANCE COCKPIT (CHANDIGARH UNIT) */}
          <div className="bg-slate-950 border border-red-950/80 rounded-3xl p-4 shadow-2xl space-y-4 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
                  <Siren className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Role 1: Ambulance Cockpit</h3>
                  <span className="text-[10px] font-mono text-red-400">UNIT {selectedScenario.ambulanceId}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                {selectedScenario.severity.toUpperCase()}
              </span>
            </div>

            {/* Patient Vitals Simulation HUD */}
            <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Patient Triage Condition
                  </span>
                  <span className="text-sm font-bold text-white block">
                    {selectedScenario.patientCondition}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-red-400">
                  <Heart className="w-4 h-4 animate-bounce fill-red-500" />
                  <span className="font-mono text-xs font-bold">118 BPM</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono">
                <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">BP</span>
                  <span className="text-xs font-bold text-amber-400">145/95</span>
                </div>
                <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">SpO2</span>
                  <span className="text-xs font-bold text-cyan-400">93%</span>
                </div>
                <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-[9px] text-slate-500 block">RESP</span>
                  <span className="text-xs font-bold text-emerald-400">22/min</span>
                </div>
              </div>
            </div>

            {/* Live Map Preview */}
            <div className="h-56 rounded-2xl overflow-hidden border border-slate-800 relative">
              <MapComponent
                center={[currentAmbulancePos.lat || 30.7333, currentAmbulancePos.lng || 76.7794]}
                zoom={14}
                ambulances={[
                  {
                    id: selectedScenario.ambulanceId,
                    ambulanceId: selectedScenario.ambulanceId,
                    severity: selectedScenario.severity,
                    patientCondition: selectedScenario.patientCondition,
                    currentLocation: currentAmbulancePos,
                    etaFormatted: activeTrip?.etaFormatted
                  }
                ]}
                hospitals={[targetHospital]}
                junctions={localJunctions}
                activeRoute={routeCoordinates}
                focusLocation={{
                  lat: currentAmbulancePos.lat,
                  lng: currentAmbulancePos.lng,
                  zoom: 14
                }}
              />
            </div>

            {/* Telemetry Row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl">
                <span className="text-[10px] text-slate-400 block font-semibold">ESTIMATED ETA</span>
                <span className="text-base font-mono font-extrabold text-red-400">
                  {activeTrip?.etaFormatted || "Calculating..."}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-2xl">
                <span className="text-[10px] text-slate-400 block font-semibold">REMAINING DISTANCE</span>
                <span className="text-base font-mono font-extrabold text-cyan-400">
                  {activeTrip?.distanceRemainingKm || "0"} km
                </span>
              </div>
            </div>
          </div>

          {/* PANEL 2: HOSPITAL ER DASHBOARD (CHANDIGARH APEX CENTERS) */}
          <div className="bg-slate-950 border border-cyan-950/80 rounded-3xl p-4 shadow-2xl space-y-4 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400">
                  <Hospital className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Role 2: Hospital Emergency Wing</h3>
                  <span className="text-[10px] text-cyan-300 font-semibold">{targetHospital.name}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300">
                🛏️ {targetHospital.bedsAvailable || 28} BEDS
              </span>
            </div>

            {/* Emergency Incoming Card */}
            {activeTrip && activeTrip.status === "active" ? (
              <div className="p-4 rounded-2xl bg-red-950/70 border-2 border-red-500 shadow-xl shadow-red-950/80 space-y-3 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    <span className="font-black text-sm text-white font-mono">
                      INBOUND {activeTrip.ambulanceId}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-white text-red-900 font-bold">
                    {activeTrip.severity}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-red-200 block">
                    {activeTrip.patientCondition}
                  </span>
                  <span className="text-[11px] text-red-300/80 block mt-0.5">
                    Origin: {activeTrip.startLocation?.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-red-900/60 font-mono text-xs text-white">
                  <div>
                    <span className="text-[10px] text-red-300 block">COUNTDOWN ETA</span>
                    <span className="text-sm font-extrabold text-white">
                      {activeTrip.etaFormatted}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-red-300 block">DISTANCE</span>
                    <span className="text-sm font-extrabold text-white">
                      {activeTrip.distanceRemainingKm} km
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-red-900/50 text-[11px] text-red-200 font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-300" />
                  <span>Trauma Resuscitation Team Alerted • Bay 1 Prepped</span>
                </div>
              </div>
            ) : activeTrip?.status === "arrived" ? (
              <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-bold text-sm text-emerald-300">Patient Received in ER</h4>
                <p className="text-xs text-slate-400">
                  {selectedScenario.ambulanceId} successfully completed delivery to {targetHospital.name}.
                </p>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
                <Clock className="w-6 h-6 text-slate-500 mx-auto" />
                <h4 className="text-xs font-bold text-white">No Inbound Emergency Right Now</h4>
                <p className="text-[11px] text-slate-400">
                  Launch the emergency mission from the top bar to simulate live incoming ambulance reception.
                </p>
              </div>
            )}

            {/* Hospital Readiness Metrics */}
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Apex Facility Readiness</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">ICU Bays</span>
                  <span className="font-bold text-emerald-400">8 Units Ready</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Cath Lab</span>
                  <span className="font-bold text-cyan-400">Standby (Cardiology)</span>
                </div>
              </div>
            </div>
          </div>

          {/* PANEL 3: TRAFFIC CONTROL & GREEN WAVE CLEARANCE */}
          <div className="bg-slate-950 border border-amber-950/80 rounded-3xl p-4 shadow-2xl space-y-4 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-600/20 border border-amber-500/40 text-amber-400">
                  <TrafficCone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Role 3: Traffic Command</h3>
                  <span className="text-[10px] text-amber-300 font-mono">CHANDIGARH SMART CITY GRID</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300">
                10 SECTOR CHOWKS
              </span>
            </div>

            {/* Priority Proximity Alert Action Card */}
            {alertJunctions.length > 0 ? (
              <div className="space-y-2.5">
                {alertJunctions.map((junc) => (
                  <div
                    key={junc.id}
                    className="p-3.5 rounded-2xl bg-red-950/80 border-2 border-red-500 shadow-xl shadow-red-950/80 space-y-2.5 animate-pulse"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-red-300 uppercase tracking-wide block">
                          🚨 2 KM PROXIMITY ALERT
                        </span>
                        <h4 className="font-extrabold text-sm text-white">{junc.name}</h4>
                      </div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-900 text-red-200">
                        {junc.distanceKm ? `${junc.distanceKm} km` : "< 2 km"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleClearJunction(junc.id, junc.activeTripId)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:brightness-110 text-white font-extrabold text-xs tracking-wider shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>CLEAR GREEN WAVE NOW</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Signals Flowing Smoothly</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">
                  {clearedJunctions.length} Cleared
                </span>
              </div>
            )}

            {/* Monitored Chandigarh Chowks List */}
            <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                Chandigarh Corridor Signals ({localJunctions.length})
              </span>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {localJunctions.map((junc) => {
                  const isAlert = junc.status === "alert";
                  const isCleared = junc.status === "cleared";

                  return (
                    <div
                      key={junc.id}
                      className={`p-2 rounded-xl text-xs border flex items-center justify-between ${
                        isAlert
                          ? "bg-red-950/60 border-red-500 text-red-200 font-bold"
                          : isCleared
                          ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isAlert
                              ? "bg-red-500 animate-ping"
                              : isCleared
                              ? "bg-emerald-400"
                              : "bg-slate-600"
                          }`}
                        />
                        <span className="truncate max-w-[170px]">{junc.name}</span>
                      </div>

                      {isAlert ? (
                        <button
                          onClick={() => handleClearJunction(junc.id, junc.activeTripId)}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]"
                        >
                          Clear
                        </button>
                      ) : isCleared ? (
                        <span className="text-[10px] font-mono text-emerald-400">GREEN WAVE</span>
                      ) : (
                        <button
                          onClick={() => handleClearJunction(junc.id, null)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-400 hover:text-white"
                        >
                          Manual
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: MASTER TACTICAL MAP CENTERPIECE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Sidebar: Ambulance & Hospital Triage */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-3xl space-y-3">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <Siren className="w-4 h-4 animate-pulse" />
                Active Mission Telemetry
              </span>
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-sm font-bold text-white block">{selectedScenario.patientCondition}</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">ETA</span>
                    <span className="font-extrabold text-red-400">{activeTrip?.etaFormatted || "Ready"}</span>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Distance</span>
                    <span className="font-extrabold text-cyan-400">{activeTrip?.distanceRemainingKm || "0"} km</span>
                  </div>
                </div>
              </div>

              {/* Destination Hospital */}
              <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Destination ER</span>
                  <span className="font-bold text-cyan-300">{targetHospital.name}</span>
                </div>
                <span className="px-2 py-1 rounded bg-cyan-950 text-cyan-300 font-mono text-[10px]">
                  {targetHospital.locationName}
                </span>
              </div>
            </div>

            {/* Traffic Proximity Alerts */}
            {alertJunctions.length > 0 && (
              <div className="bg-red-950/80 border-2 border-red-500 p-4 rounded-3xl space-y-2 animate-pulse">
                <span className="text-xs font-bold text-white">🚨 Approaching Chowk: {alertJunctions[0].name}</span>
                <button
                  type="button"
                  onClick={() => handleClearJunction(alertJunctions[0].id, alertJunctions[0].activeTripId)}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Clear Route (Green Wave)
                </button>
              </div>
            )}
          </div>

          {/* Center Map (8 Cols) */}
          <div className="lg:col-span-8 h-[600px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
            <MapComponent
              center={[30.7333, 76.7794]}
              zoom={13}
              ambulances={[
                {
                  id: selectedScenario.ambulanceId,
                  ambulanceId: selectedScenario.ambulanceId,
                  severity: selectedScenario.severity,
                  patientCondition: selectedScenario.patientCondition,
                  currentLocation: currentAmbulancePos,
                  etaFormatted: activeTrip?.etaFormatted
                }
              ]}
              hospitals={hospitals}
              junctions={localJunctions}
              activeRoute={routeCoordinates}
            />
          </div>
        </div>
      )}

      {/* Real-time System Event Log Stream */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl shadow-xl space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-white">Real-Time Coordination Event Stream (Chandigarh Network)</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Live Socket Stream</span>
        </div>

        <div className="space-y-1 max-h-28 overflow-y-auto pr-2 text-xs font-mono">
          {eventLogs.map((log, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 py-1 px-2 rounded-lg bg-slate-950/60 border border-slate-800/60"
            >
              <span className="text-slate-500 text-[10px]">{log.time}</span>
              <span
                className={
                  log.type === "dispatch"
                    ? "text-red-400 font-bold"
                    : log.type === "traffic"
                    ? "text-amber-400 font-bold"
                    : log.type === "greenwave"
                    ? "text-emerald-400 font-bold"
                    : log.type === "arrival"
                    ? "text-emerald-300 font-bold"
                    : log.type === "hospital"
                    ? "text-cyan-300 font-bold"
                    : "text-slate-300"
                }
              >
                {log.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
