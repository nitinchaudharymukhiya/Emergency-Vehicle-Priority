import React, { useState, useEffect } from "react";
import {
  Hospital,
  Siren,
  Clock,
  Milestone,
  AlertOctagon,
  CheckCircle2,
  PhoneCall,
  Activity,
  Bed,
  MapPin,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
  Volume2
} from "lucide-react";
import MapComponent from "../components/MapComponent";
import { SAMPLE_HOSPITALS, SAMPLE_JUNCTIONS, SEVERITIES } from "../data/constants";
import { socket } from "../services/socket";
import { soundEffects } from "../services/audio";
import confetti from "canvas-confetti";

export default function HospitalPage({
  hospitals = SAMPLE_HOSPITALS,
  junctions = SAMPLE_JUNCTIONS,
  allTrips = []
}) {
  const [selectedHospitalId, setSelectedHospitalId] = useState(hospitals[0]?.id || "hosp_1");
  const [activeAmbulances, setActiveAmbulances] = useState([]);
  const [historyTrips, setHistoryTrips] = useState([]);
  const [latestAlertBanner, setLatestAlertBanner] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const currentHospital =
    hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];

  // Join Hospital Room on mount or when hospital selection changes
  useEffect(() => {
    soundEffects.init();
    socket.emit("join:hospital", { hospitalId: selectedHospitalId });

    // Filter initial active & completed trips from allTrips
    const initialActive = allTrips.filter(
      (t) => t.hospitalId === selectedHospitalId && t.status === "active"
    );
    const initialHistory = allTrips.filter(
      (t) => t.hospitalId === selectedHospitalId && t.status === "arrived"
    );

    setActiveAmbulances(initialActive);
    setHistoryTrips(initialHistory);

    // Initial state from socket
    const onActiveTrips = (trips) => {
      setActiveAmbulances(trips);
      if (trips.length > 0 && !selectedTrip) {
        setSelectedTrip(trips[0]);
      }
    };

    // New Incoming Trip Alert
    const onNewTrip = ({ trip, message }) => {
      soundEffects.playUrgentSiren();
      setLatestAlertBanner({
        tripId: trip.id,
        ambulanceId: trip.ambulanceId,
        condition: trip.patientCondition,
        severity: trip.severity,
        eta: trip.etaFormatted,
        message: message || `New Incoming Emergency: ${trip.ambulanceId}`
      });

      setActiveAmbulances((prev) => {
        const exists = prev.some((t) => t.id === trip.id);
        if (!exists) return [trip, ...prev];
        return prev.map((t) => (t.id === trip.id ? trip : t));
      });

      setSelectedTrip(trip);

      // Auto dismiss alert banner after 10s
      setTimeout(() => {
        setLatestAlertBanner(null);
      }, 10000);
    };

    // Live Telemetry updates
    const onTelemetry = (telemetry) => {
      setActiveAmbulances((prev) =>
        prev.map((t) => {
          if (t.id === telemetry.tripId) {
            return {
              ...t,
              currentLocation: telemetry.currentLocation,
              distanceRemainingKm: telemetry.distanceRemainingKm,
              etaSeconds: telemetry.etaSeconds,
              etaFormatted: telemetry.etaFormatted
            };
          }
          return t;
        })
      );
    };

    // Trip Arrived
    const onTripArrived = ({ trip, message }) => {
      soundEffects.playArrivalChime();
      confetti({ particleCount: 70, spread: 60 });

      setActiveAmbulances((prev) => prev.filter((t) => t.id !== trip.id));
      setHistoryTrips((prev) => [trip, ...prev]);

      setLatestAlertBanner({
        type: "success",
        message: message || `Ambulance ${trip.ambulanceId} has safely arrived at ER!`
      });

      setTimeout(() => {
        setLatestAlertBanner(null);
      }, 7000);
    };

    socket.on("hospital:active_trips", onActiveTrips);
    socket.on("trip:new", onNewTrip);
    socket.on("trip:telemetry", onTelemetry);
    socket.on("trip:arrived", onTripArrived);

    return () => {
      socket.off("hospital:active_trips", onActiveTrips);
      socket.off("trip:new", onNewTrip);
      socket.off("trip:telemetry", onTelemetry);
      socket.off("trip:arrived", onTripArrived);
    };
  }, [selectedHospitalId, allTrips]);

  // Keep selected trip synced
  const activeSelectedTrip =
    activeAmbulances.find((t) => t.id === selectedTrip?.id) || activeAmbulances[0] || null;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Top Header & Hospital Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 shadow-lg shadow-cyan-950/50">
            <Hospital className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Emergency Hospital Operations Center
              </h1>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                ER TRIAGE ROOM
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live inbound ambulance telemetry, trauma unit readiness, and bed management
            </p>
          </div>
        </div>

        {/* Hospital Dropdown */}
        <div className="flex items-center gap-3">
          <div className="w-full sm:w-80">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Active Hospital Station
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-cyan-400 transition-colors shadow-inner"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  🏥 {h.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Hospital Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">INBOUND AMBULANCES</span>
            <span className="text-2xl font-mono font-black text-red-400">
              {activeAmbulances.length}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-800/40 text-red-400">
            <Siren className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">ER BEDS AVAILABLE</span>
            <span className="text-2xl font-mono font-black text-emerald-400">
              {currentHospital.availableBeds || currentHospital.bedsAvailable || 18}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-emerald-400">
            <Bed className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">TRAUMA LEVEL</span>
            <span className="text-xs font-bold text-cyan-300 block mt-1">
              {currentHospital.traumaLevel?.split(" ")[0] || "Level 1"} Care
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-800/40 text-cyan-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">EMERGENCY HELPLINE</span>
            <span className="text-xs font-mono font-bold text-slate-300 block mt-1">
              {currentHospital.emergencyPhone || "+91 497 2731001"}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <PhoneCall className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Emergency Banner Alert */}
      {latestAlertBanner && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 animate-bounce transition-all ${
            latestAlertBanner.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/80 text-emerald-200 shadow-xl shadow-emerald-950"
              : "bg-red-950/90 border-red-500 text-red-200 shadow-2xl shadow-red-950"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600 text-white animate-pulse">
              <Siren className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                <span>{latestAlertBanner.message}</span>
                {latestAlertBanner.severity && (
                  <span className="text-xs px-2 py-0.5 rounded bg-white text-red-900 font-black">
                    {latestAlertBanner.severity}
                  </span>
                )}
              </div>
              <p className="text-xs text-red-300/80 mt-0.5">
                ER trauma resuscitation team alert dispatched. Prepare operating bay.
              </p>
            </div>
          </div>
          <button
            onClick={() => setLatestAlertBanner(null)}
            className="text-xs px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-900 text-white font-semibold cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Main Grid: Incoming Deck + Live Map & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Inbound Ambulances Deck (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-500 animate-pulse" />
              Active Inbound Ambulances ({activeAmbulances.length})
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Auto Refresh</span>
          </div>

          {activeAmbulances.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-500/60" />
              </div>
              <h3 className="text-sm font-bold text-white">No Inbound Ambulances</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                There are currently no active emergency trips en route to {currentHospital.name}.
                New dispatches will automatically appear with audible sirens.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeAmbulances.map((amb) => {
                const isSelected = activeSelectedTrip?.id === amb.id;
                const isCritical = amb.severity === "Critical";
                const isSerious = amb.severity === "Serious";

                return (
                  <div
                    key={amb.id}
                    onClick={() => setSelectedTrip(amb)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-slate-900/90 border-red-500/80 shadow-xl shadow-red-950/40"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Siren className="w-4 h-4 text-red-400 animate-pulse" />
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
                        </div>
                        <span className="font-extrabold text-sm text-white font-mono">
                          {amb.ambulanceId}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isCritical
                            ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : isSerious
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        }`}
                      >
                        {amb.severity}
                      </span>
                    </div>

                    {/* Patient info */}
                    <div className="py-2.5">
                      <span className="text-xs font-semibold text-slate-200 block">
                        {amb.patientCondition}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        Origin: {amb.startLocation?.name || "Kannur Corridor"}
                      </span>
                    </div>

                    {/* Live ETA & Distance Counter */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono">
                        <Clock className="w-3.5 h-3.5 text-red-400" />
                        <span className="font-bold text-red-400">
                          ETA: {amb.etaFormatted || "Calculating..."}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono justify-end">
                        <Milestone className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{amb.distanceRemainingKm || "0"} km away</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Arrived History List */}
          <div className="glass-panel p-4 rounded-2xl border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Completed & Arrived Emergency Trips ({historyTrips.length})
            </h3>

            {historyTrips.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">No completed trips logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {historyTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-bold text-white">{trip.ambulanceId}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({trip.severity})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {trip.patientCondition}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                      ARRIVED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Hospital Tactical Inbound Map (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="h-[520px] relative rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <MapComponent
              center={[currentHospital.lat, currentHospital.lng]}
              zoom={13}
              ambulances={activeAmbulances}
              hospitals={[currentHospital]}
              junctions={junctions}
              activeRoute={activeSelectedTrip?.route || []}
              focusLocation={{
                lat: activeSelectedTrip?.currentLocation?.lat || currentHospital.lat,
                lng: activeSelectedTrip?.currentLocation?.lng || currentHospital.lng,
                zoom: 14
              }}
            />

            {/* Inbound Status Overlay */}
            <div className="absolute top-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 shadow-xl flex items-center gap-3 text-xs">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Hospital className="w-3.5 h-3.5" />
                {currentHospital.name.split(" ")[0]} ER Receiver
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-red-400 font-mono font-bold">
                {activeAmbulances.length} Active Unit(s) Inbound
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
