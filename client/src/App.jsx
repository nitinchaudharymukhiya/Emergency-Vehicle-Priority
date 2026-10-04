import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import AmbulancePage from "./pages/AmbulancePage";
import HospitalPage from "./pages/HospitalPage";
import TrafficPage from "./pages/TrafficPage";
import SplitViewDemo from "./pages/SplitViewDemo";
import { socket } from "./services/socket";
import { SAMPLE_HOSPITALS, SAMPLE_JUNCTIONS } from "./data/constants";

export default function App() {
  // Determine initial tab from URL path or hash
  const getInitialTab = () => {
    const path = window.location.pathname.replace("/", "").toLowerCase();
    const hash = window.location.hash.replace("#/", "").toLowerCase();
    const target = path || hash;
    if (target === "hospital") return "hospital";
    if (target === "traffic") return "traffic";
    if (target === "split") return "split";
    return "ambulance";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [hospitals, setHospitals] = useState(SAMPLE_HOSPITALS);
  const [junctions, setJunctions] = useState(SAMPLE_JUNCTIONS);
  const [allTrips, setAllTrips] = useState([]);

  // Sync state with URL
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    window.history.pushState(null, "", `/${tabId}`);
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(getInitialTab());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Fetch seed data & trips from server
  useEffect(() => {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

    const fetchInitialData = async () => {
      try {
        const [hospRes, juncRes, tripsRes] = await Promise.all([
          fetch(`${SERVER_URL}/api/hospitals`).catch(() => null),
          fetch(`${SERVER_URL}/api/junctions`).catch(() => null),
          fetch(`${SERVER_URL}/api/trips`).catch(() => null)
        ]);

        if (hospRes && hospRes.ok) {
          const hospData = await hospRes.json();
          if (Array.isArray(hospData) && hospData.length > 0) setHospitals(hospData);
        }

        if (juncRes && juncRes.ok) {
          const juncData = await juncRes.json();
          if (Array.isArray(juncData) && juncData.length > 0) setJunctions(juncData);
        }

        if (tripsRes && tripsRes.ok) {
          const tripsData = await tripsRes.json();
          if (Array.isArray(tripsData)) setAllTrips(tripsData);
        }
      } catch (err) {
        console.warn("Using local fallback constants for initial seed data:", err.message);
      }
    };

    fetchInitialData();

    // Socket status listeners
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // Global Junction status synchronization
    socket.on("junction:status_updated", ({ junctions: updatedJunctions, junction }) => {
      if (updatedJunctions) {
        setJunctions(updatedJunctions);
      } else if (junction) {
        setJunctions((prev) =>
          prev.map((j) => (j.id === junction.id ? junction : j))
        );
      }
    });

    // Global Trip Start Listener
    socket.on("trip:created", (newTrip) => {
      setAllTrips((prev) => [newTrip, ...prev]);
    });

    socket.on("trip:arrived", ({ trip }) => {
      setAllTrips((prev) =>
        prev.map((t) => (t.id === trip.id ? { ...t, status: "arrived" } : t))
      );
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("junction:status_updated");
      socket.off("trip:created");
      socket.off("trip:arrived");
    };
  }, []);

  const activeTripsCount = allTrips.filter((t) => t.status === "active").length;
  const alertedJunctionsCount = junctions.filter((j) => j.status === "alert").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-red-500/30 selection:text-red-200">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isConnected={isConnected}
        activeTripsCount={activeTripsCount}
        alertedJunctionsCount={alertedJunctionsCount}
      />

      {/* Main Role Content */}
      <main className="flex-1 pb-12">
        {activeTab === "ambulance" && (
          <AmbulancePage
            hospitals={hospitals}
            junctions={junctions}
            activeTrips={allTrips}
          />
        )}
        {activeTab === "hospital" && (
          <HospitalPage
            hospitals={hospitals}
            junctions={junctions}
            allTrips={allTrips}
          />
        )}
        {activeTab === "traffic" && (
          <TrafficPage
            hospitals={hospitals}
            junctions={junctions}
            activeTrips={allTrips}
          />
        )}
        {activeTab === "split" && (
          <SplitViewDemo
            hospitals={hospitals}
            junctions={junctions}
            allTrips={allTrips}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            ClearPath Emergency Ambulance & Green Corridor Coordination System &copy; {new Date().getFullYear()}
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Node.js + Socket.IO + React + Leaflet + OSRM
          </span>
        </div>
      </footer>
    </div>
  );
}
