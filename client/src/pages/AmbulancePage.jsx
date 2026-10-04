import React, { useState, useEffect, useRef } from "react";
import {
  Siren,
  Navigation,
  Compass,
  MapPin,
  Hospital,
  AlertTriangle,
  Play,
  Pause,
  FastForward,
  CheckCircle2,
  Radio,
  Clock,
  Milestone,
  Crosshair,
  ShieldCheck,
  PhoneCall,
  Activity,
  RotateCcw
} from "lucide-react";
import MapComponent from "../components/MapComponent";
import {
  SAMPLE_HOSPITALS,
  SAMPLE_JUNCTIONS,
  PRESET_START_LOCATIONS,
  PATIENT_CONDITIONS,
  SEVERITIES
} from "../data/constants";
import { fetchOsrmRoute } from "../services/osrm";
import { socket } from "../services/socket";
import { soundEffects } from "../services/audio";
import confetti from "canvas-confetti";

export default function AmbulancePage({
  hospitals = SAMPLE_HOSPITALS,
  junctions = SAMPLE_JUNCTIONS,
  activeTrips = []
}) {
  // Form State
  const [ambulanceId, setAmbulanceId] = useState(`AMB-${Math.floor(100 + Math.random() * 900)}`);
  const [patientCondition, setPatientCondition] = useState("Acute Myocardial Infarction (Cardiac)");
  const [severity, setSeverity] = useState("Critical");
  const [selectedHospitalId, setSelectedHospitalId] = useState(hospitals[0]?.id || "hosp_1");
  const [startLocation, setStartLocation] = useState(PRESET_START_LOCATIONS[0]);
  const [isUsingGps, setIsUsingGps] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // Active Trip State
  const [activeTrip, setActiveTrip] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [currentCoordIndex, setCurrentCoordIndex] = useState(0);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Simulation Controls
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState(1); // 1x, 2x, 4x, 8x
  const simTimerRef = useRef(null);
  const gpsWatchIdRef = useRef(null);

  // Selected hospital object
  const selectedHospital =
    hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];

  // Calculate route preview on load or change if not in active trip
  useEffect(() => {
    if (!activeTrip && startLocation && selectedHospital) {
      calculatePreviewRoute();
    }
  }, [startLocation, selectedHospitalId, activeTrip]);

  const calculatePreviewRoute = async () => {
    setIsLoadingRoute(true);
    const routeRes = await fetchOsrmRoute(startLocation, {
      lat: selectedHospital.lat,
      lng: selectedHospital.lng
    });
    if (routeRes.success) {
      setRouteCoordinates(routeRes.coordinates);
    }
    setIsLoadingRoute(false);
  };

  // Listen for socket updates for this trip
  useEffect(() => {
    const onTripStatusChanged = (updatedTrip) => {
      if (activeTrip && updatedTrip.id === activeTrip.id) {
        setActiveTrip(updatedTrip);
        if (updatedTrip.status === "arrived") {
          setIsSimulating(false);
          soundEffects.playArrivalChime();
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
    };

    const onTelemetryAck = (data) => {
      if (activeTrip && data.tripId === activeTrip.id) {
        setActiveTrip((prev) =>
          prev
            ? {
                ...prev,
                distanceRemainingKm: data.distanceRemainingKm,
                etaFormatted: data.etaFormatted
              }
            : null
        );
      }
    };

    socket.on("trip:status_changed", onTripStatusChanged);
    socket.on("trip:telemetry_ack", onTelemetryAck);

    return () => {
      socket.off("trip:status_changed", onTripStatusChanged);
      socket.off("trip:telemetry_ack", onTelemetryAck);
    };
  }, [activeTrip]);

  // Handle GPS location tracking
  const handleToggleGps = () => {
    if (isUsingGps) {
      // Turn off GPS
      if (gpsWatchIdRef.current) {
        navigator.geolocation.clearWatch(gpsWatchIdRef.current);
        gpsWatchIdRef.current = null;
      }
      setIsUsingGps(false);
    } else {
      // Turn on GPS
      if (!navigator.geolocation) {
        setGpsError("Geolocation is not supported by your browser.");
        return;
      }
      setGpsError(null);
      setIsUsingGps(true);

      gpsWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            name: "Live GPS Location"
          };
          setStartLocation(newLoc);

          if (activeTrip) {
            // Send live location update
            socket.emit("trip:location_update", {
              tripId: activeTrip.id,
              currentLocation: newLoc,
              remainingRoute: [
                { lat: selectedHospital.lat, lng: selectedHospital.lng }
              ]
            });
          }
        },
        (err) => {
          console.error("GPS Watch Error:", err);
          setGpsError("GPS permission denied or unavailable. Using preset.");
          setIsUsingGps(false);
        },
        { enableHighAccuracy: true, maximumAge: 1000 }
      );
    }
  };

  // Start Trip
  const handleStartTrip = async () => {
    soundEffects.init();
    soundEffects.playUrgentSiren();

    setIsLoadingRoute(true);
    let coords = routeCoordinates;
    if (coords.length === 0) {
      const routeRes = await fetchOsrmRoute(startLocation, {
        lat: selectedHospital.lat,
        lng: selectedHospital.lng
      });
      coords = routeRes.coordinates;
      setRouteCoordinates(coords);
    }
    setIsLoadingRoute(false);

    const initialCoord = coords[0] || startLocation;

    const payload = {
      ambulanceId: ambulanceId.trim() || "AMB-108",
      patientCondition,
      severity,
      hospitalId: selectedHospital.id,
      startLocation: {
        lat: startLocation.lat,
        lng: startLocation.lng,
        name: startLocation.name || "Emergency Pickup Point"
      },
      route: coords,
      currentLocation: initialCoord,
      notes: `Dispatch via ClearPath Unit ${ambulanceId}`
    };

    socket.emit("trip:start", payload);

    socket.once("trip:created", (newTrip) => {
      setActiveTrip(newTrip);
      setCurrentCoordIndex(0);
      setIsSimulating(true); // Default to auto simulate movement
    });
  };

  // Simulation Loop along OSRM Waypoints
  useEffect(() => {
    if (isSimulating && activeTrip && activeTrip.status === "active") {
      if (simTimerRef.current) clearInterval(simTimerRef.current);

      const intervalMs = Math.max(250, 1000 / simSpeed);

      simTimerRef.current = setInterval(() => {
        setCurrentCoordIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= routeCoordinates.length) {
            // Reached destination!
            clearInterval(simTimerRef.current);
            setIsSimulating(false);

            const lastCoord =
              routeCoordinates[routeCoordinates.length - 1] ||
              selectedHospital;

            socket.emit("trip:location_update", {
              tripId: activeTrip.id,
              currentLocation: lastCoord,
              remainingRoute: []
            });

            // End trip
            socket.emit("trip:end", {
              tripId: activeTrip.id,
              reason: "Arrived at Hospital ER"
            });

            return prevIndex;
          }

          const currentPos = routeCoordinates[nextIndex];
          const remainingRouteSlice = routeCoordinates.slice(nextIndex);

          // Emit location update to server
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
  }, [isSimulating, activeTrip, routeCoordinates, simSpeed]);

  // End Trip Manually
  const handleEndTrip = () => {
    if (!activeTrip) return;
    setIsSimulating(false);
    socket.emit("trip:end", {
      tripId: activeTrip.id,
      reason: "Manually completed by paramedic"
    });
    soundEffects.playArrivalChime();
    confetti({ particleCount: 90, spread: 60 });
  };

  // Reset for new trip
  const handleResetForNewTrip = () => {
    setActiveTrip(null);
    setCurrentCoordIndex(0);
    setIsSimulating(false);
    setAmbulanceId(`AMB-${Math.floor(100 + Math.random() * 900)}`);
  };

  // Current ambulance live position
  const currentPos =
    activeTrip && routeCoordinates.length > 0
      ? routeCoordinates[currentCoordIndex] || activeTrip.currentLocation
      : startLocation;

  // Nearby junctions status for radar
  const activeJunctionAlerts = junctions.filter(
    (j) => j.status === "alert" || j.status === "cleared"
  );

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Top Banner / Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-red-950/70 via-slate-900 to-slate-900 border border-red-900/50 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-red-600/20 border border-red-500/40 text-red-400">
            <Siren className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Ambulance Dispatch & Navigation Cockpit
              {activeTrip?.status === "active" && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-500 text-white font-mono animate-pulse">
                  MISSION ACTIVE
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              Real-time green corridor telemetry and automated traffic junction clearance
            </p>
          </div>
        </div>

        {/* Live Metrics Pill if active */}
        {activeTrip && (
          <div className="flex items-center gap-3">
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-mono">LIVE ETA</span>
              <span className="text-sm font-extrabold text-red-400 font-mono">
                {activeTrip.etaFormatted || "Calculating..."}
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-mono">REMAINING</span>
              <span className="text-sm font-extrabold text-cyan-400 font-mono">
                {activeTrip.distanceRemainingKm || "0"} km
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel / Form (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {!activeTrip ? (
            /* PRE-TRIP DISPATCH FORM */
            <div className="glass-panel p-6 rounded-2xl space-y-5 border-slate-800/90 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <Navigation className="w-4 h-4" />
                  <span>Initiate Emergency Dispatch</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Step 1 of 2</span>
              </div>

              {/* Ambulance ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Ambulance Identifier
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ambulanceId}
                    onChange={(e) => setAmbulanceId(e.target.value)}
                    placeholder="e.g. AMB-108, KNR-EMR-04"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-red-400 font-mono font-bold">
                    🚑 108 UNIT
                  </span>
                </div>
              </div>

              {/* Patient Condition */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Patient Condition & Triage
                </label>
                <select
                  value={patientCondition}
                  onChange={(e) => setPatientCondition(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                >
                  {PATIENT_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Radios */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Emergency Severity Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERITIES.map((sev) => {
                    const isSelected = severity === sev.id;
                    return (
                      <button
                        key={sev.id}
                        type="button"
                        onClick={() => setSeverity(sev.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? `${sev.badgeColor} border-2 shadow-lg`
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${sev.dotColor} mb-1`} />
                        <span>{sev.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Destination Hospital */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Destination Hospital (Kannur)</span>
                  <span className="text-[10px] text-emerald-400">🟢 ER Alert Active</span>
                </label>
                <select
                  value={selectedHospitalId}
                  onChange={(e) => setSelectedHospitalId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} — ({h.locationName})
                    </option>
                  ))}
                </select>
                <div className="mt-2 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-slate-400">
                    <span className="font-semibold text-white block">{selectedHospital.name}</span>
                    <span className="text-[11px] text-slate-500">{selectedHospital.traumaLevel}</span>
                  </div>
                  <span className="px-2 py-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono text-[11px]">
                    🛏️ {selectedHospital.availableBeds || selectedHospital.bedsAvailable || 16} Beds
                  </span>
                </div>
              </div>

              {/* Start Location Preset + GPS */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Ambulance Pickup / Starting Location
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleGps}
                    className={`text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-lg border transition-colors ${
                      isUsingGps
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                    }`}
                  >
                    <Crosshair className="w-3 h-3" />
                    {isUsingGps ? "Using Live GPS" : "Use Browser GPS"}
                  </button>
                </div>

                {!isUsingGps && (
                  <select
                    value={startLocation.name}
                    onChange={(e) => {
                      const loc = PRESET_START_LOCATIONS.find((l) => l.name === e.target.value);
                      if (loc) setStartLocation(loc);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 transition-colors"
                  >
                    {PRESET_START_LOCATIONS.map((loc) => (
                      <option key={loc.name} value={loc.name}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                )}

                {gpsError && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {gpsError}
                  </p>
                )}
              </div>

              {/* Start Trip Button */}
              <button
                type="button"
                onClick={handleStartTrip}
                disabled={isLoadingRoute}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-red-900/50 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Siren className="w-5 h-5 animate-pulse" />
                {isLoadingRoute ? "Calculating Fast Corridor..." : "START EMERGENCY TRIP"}
              </button>
            </div>
          ) : (
            /* ACTIVE TRIP COCKPIT HUD */
            <div className="glass-panel p-6 rounded-2xl space-y-5 border-slate-800/90 shadow-2xl">
              {/* Active Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <span className="font-bold text-white text-sm">
                    {activeTrip.ambulanceId} EN ROUTE
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-mono font-bold">
                  {activeTrip.severity.toUpperCase()}
                </span>
              </div>

              {/* Patient Card */}
              <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Patient Triage
                    </span>
                    <span className="text-sm font-bold text-white block">
                      {activeTrip.patientCondition}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono">
                    {activeTrip.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-cyan-400 pt-1 border-t border-slate-800/60">
                  <Hospital className="w-3.5 h-3.5" />
                  <span>Dest: {activeTrip.hospitalName}</span>
                </div>
              </div>

              {/* Telemetry Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Clock className="w-3.5 h-3.5 text-red-400" />
                    <span>Estimated Arrival</span>
                  </div>
                  <span className="text-lg font-mono font-black text-white">
                    {activeTrip.etaFormatted || "Calculating..."}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Milestone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Distance Left</span>
                  </div>
                  <span className="text-lg font-mono font-black text-cyan-400">
                    {activeTrip.distanceRemainingKm || "0"} km
                  </span>
                </div>
              </div>

              {/* Simulation Mode Controls */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Simulation Movement Engine
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      isSimulating
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {isSimulating ? "MOVING" : "PAUSED"}
                  </span>
                </div>

                {/* Progress bar along route */}
                <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-red-500 to-emerald-500 h-full transition-all duration-300"
                    style={{
                      width: `${
                        routeCoordinates.length > 0
                          ? Math.min(100, (currentCoordIndex / (routeCoordinates.length - 1)) * 100)
                          : 0
                      }%`
                    }}
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsSimulating(!isSimulating)}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      isSimulating
                        ? "bg-amber-600/20 text-amber-400 border border-amber-500/40 hover:bg-amber-600/30"
                        : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/30"
                    }`}
                  >
                    {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    {isSimulating ? "Pause Simulation" : "Resume Movement"}
                  </button>

                  {/* Speed Multipliers */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                    {[1, 2, 4, 8].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSimSpeed(s)}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                          simSpeed === s
                            ? "bg-red-600 text-white shadow"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* End Trip / Arrived Actions */}
              {activeTrip.status === "active" ? (
                <button
                  type="button"
                  onClick={handleEndTrip}
                  className="w-full py-3 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-sm border border-emerald-500/50 shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  CONFIRM ARRIVAL AT HOSPITAL ER
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <span className="text-sm font-bold text-emerald-300 block">
                      Patient Safely Delivered!
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ER Team Received Handover at {activeTrip.hospitalName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForNewTrip}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Start Next Emergency Dispatch
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Upcoming Junctions Radar Panel */}
          <div className="glass-panel p-4 rounded-2xl border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Corridor Junction Status
              </span>
              <span className="text-[10px] font-mono text-slate-400">2.0 km Proximity</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {junctions.slice(0, 5).map((junc) => {
                const isAlert = junc.status === "alert";
                const isCleared = junc.status === "cleared";

                return (
                  <div
                    key={junc.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs border transition-all ${
                      isAlert
                        ? "bg-red-950/40 border-red-500/40 text-red-300"
                        : isCleared
                        ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                        : "bg-slate-900/60 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isAlert
                            ? "bg-red-500 animate-ping"
                            : isCleared
                            ? "bg-emerald-500"
                            : "bg-slate-600"
                        }`}
                      />
                      <span className="font-semibold">{junc.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        isAlert
                          ? "bg-red-500 text-white animate-pulse"
                          : isCleared
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "text-slate-500"
                      }`}
                    >
                      {isAlert ? "ALERTING" : isCleared ? "CLEARED" : "NORMAL"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Live Tactical Map (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="h-[560px] relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <MapComponent
              center={[currentPos.lat || KANNUR_CENTER.lat, currentPos.lng || KANNUR_CENTER.lng]}
              zoom={14}
              ambulances={
                activeTrip
                  ? [
                      {
                        id: activeTrip.id,
                        ambulanceId: activeTrip.ambulanceId,
                        severity: activeTrip.severity,
                        patientCondition: activeTrip.patientCondition,
                        currentLocation: currentPos,
                        etaFormatted: activeTrip.etaFormatted
                      }
                    ]
                  : [
                      {
                        id: "preview",
                        ambulanceId: ambulanceId,
                        severity: severity,
                        patientCondition: patientCondition,
                        currentLocation: startLocation
                      }
                    ]
              }
              hospitals={hospitals}
              junctions={junctions}
              activeRoute={routeCoordinates}
              focusLocation={{
                lat: currentPos.lat || KANNUR_CENTER.lat,
                lng: currentPos.lng || KANNUR_CENTER.lng,
                zoom: 14
              }}
            />

            {/* Floating Map HUD */}
            <div className="absolute top-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 shadow-xl flex items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-bold text-white font-mono">
                  {activeTrip ? `${activeTrip.ambulanceId} (LIVE)` : "ROUTE PREVIEW"}
                </span>
              </div>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300 font-mono">
                {routeCoordinates.length} Corridor Waypoints
              </span>
            </div>
          </div>

          {/* Quick Info Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">COORDINATION ROOM</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                hospital:{selectedHospital.id}
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">SIGNAL CLEARANCE</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {activeJunctionAlerts.filter((j) => j.status === "cleared").length} Cleared
              </span>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block font-semibold">EMERGENCY PROTOCOL</span>
              <span className="text-xs font-mono font-bold text-red-400">
                Code 3 Siren & Lights
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
