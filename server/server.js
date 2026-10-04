import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { HOSPITALS, JUNCTIONS, START_LOCATIONS } from "./data/seedData.js";
import {
  getDistanceKm,
  calculateRemainingRouteDistance,
  estimateEtaSeconds,
  formatEta,
  findNearbyJunctions
} from "./utils/geo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable CORS for client
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  })
);
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;
const TRIPS_FILE = path.join(__dirname, "data", "trips.json");

// In-memory data store
let trips = [];
let junctionsState = JSON.parse(JSON.stringify(JUNCTIONS)); // Deep clone

// Ensure data folder and trips.json exist
function loadPersistedTrips() {
  try {
    const dir = path.dirname(TRIPS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(TRIPS_FILE)) {
      const data = fs.readFileSync(TRIPS_FILE, "utf-8");
      trips = JSON.parse(data || "[]");
      console.log(`[ClearPath DB] Loaded ${trips.length} stored trips.`);
    } else {
      fs.writeFileSync(TRIPS_FILE, JSON.stringify([], null, 2));
    }
  } catch (err) {
    console.error("[ClearPath DB Error] Failed to load trips.json:", err.message);
    trips = [];
  }
}

function persistTrips() {
  try {
    fs.writeFileSync(TRIPS_FILE, JSON.stringify(trips, null, 2));
  } catch (err) {
    console.error("[ClearPath DB Error] Failed to write trips.json:", err.message);
  }
}

loadPersistedTrips();

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "ClearPath Backend is running",
    service: "Emergency Vehicle Priority"
  });
});


// REST API Endpoints
app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    system: "ClearPath Emergency Coordination System",
    activeTrips: trips.filter((t) => t.status === "active").length,
    timestamp: new Date().toISOString()
  });
});

app.get("/api/hospitals", (req, res) => {
  res.json(HOSPITALS);
});

app.get("/api/junctions", (req, res) => {
  res.json(junctionsState);
});

app.get("/api/start-locations", (req, res) => {
  res.json(START_LOCATIONS);
});

app.get("/api/trips", (req, res) => {
  const { hospitalId, status } = req.query;
  let result = [...trips];
  if (hospitalId) {
    result = result.filter((t) => t.hospitalId === hospitalId);
  }
  if (status) {
    result = result.filter((t) => t.status === status);
  }
  res.json(result);
});

app.get("/api/trips/:id", (req, res) => {
  const trip = trips.find((t) => t.id === req.params.id);
  if (!trip) return res.status(404).json({ error: "Trip not found" });
  res.json(trip);
});

// Socket.IO Real-time Logic
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Hospital Dashboard Room
  socket.on("join:hospital", ({ hospitalId }) => {
    socket.join(`hospital:${hospitalId}`);
    console.log(`[Socket] ${socket.id} joined hospital:${hospitalId}`);

    // Send currently active trips for this hospital
    const activeTrips = trips.filter(
      (t) => t.hospitalId === hospitalId && t.status === "active"
    );
    socket.emit("hospital:active_trips", activeTrips);
  });

  // Traffic Control Room
  socket.on("join:traffic", () => {
    socket.join("traffic-control");
    console.log(`[Socket] ${socket.id} joined traffic-control room`);

    const activeTrips = trips.filter((t) => t.status === "active");
    socket.emit("traffic:initial_state", {
      activeTrips,
      junctions: junctionsState
    });
  });

  // Ambulance Room
  socket.on("join:ambulance", ({ tripId }) => {
    socket.join(`ambulance:${tripId}`);
    console.log(`[Socket] ${socket.id} joined ambulance:${tripId}`);
  });

  // Start Trip Event
  socket.on("trip:start", (payload) => {
    const {
      ambulanceId,
      patientCondition,
      severity, // 'Critical' | 'Serious' | 'Stable'
      hospitalId,
      startLocation, // { lat, lng, name }
      route, // array of [lat, lng] or [{lat, lng}]
      currentLocation,
      notes
    } = payload;

    const hospital = HOSPITALS.find((h) => h.id === hospitalId) || HOSPITALS[0];
    const initialDist = calculateRemainingRouteDistance(
      currentLocation || startLocation,
      route
    );
    const etaSec = estimateEtaSeconds(initialDist);

    const tripId = `TRIP-${Date.now().toString().slice(-6)}`;
    const newTrip = {
      id: tripId,
      ambulanceId: ambulanceId || `AMB-${Math.floor(100 + Math.random() * 900)}`,
      patientCondition: patientCondition || "Emergency Trauma",
      severity: severity || "Critical",
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      hospitalLocation: { lat: hospital.lat, lng: hospital.lng },
      startLocation: startLocation || { lat: 11.8688, lng: 75.3622, name: "Start Point" },
      route: route || [],
      currentLocation: currentLocation || startLocation,
      distanceRemainingKm: parseFloat(initialDist.toFixed(2)),
      etaSeconds: etaSec,
      etaFormatted: formatEta(etaSec),
      status: "active", // active | arrived
      startedAt: new Date().toISOString(),
      endedAt: null,
      notes: notes || "",
      alertedJunctions: [] // Junction IDs that have been alerted
    };

    // Calculate initial nearby junctions
    const nearbyJunctions = findNearbyJunctions(
      newTrip.currentLocation,
      junctionsState,
      2.0
    );

    nearbyJunctions.forEach((j) => {
      const idx = junctionsState.findIndex((item) => item.id === j.id);
      if (idx !== -1 && junctionsState[idx].status !== "cleared") {
        junctionsState[idx].status = "alert";
        junctionsState[idx].activeTripId = newTrip.id;
        junctionsState[idx].ambulanceId = newTrip.ambulanceId;
        newTrip.alertedJunctions.push(j.id);
      }
    });

    trips.unshift(newTrip);
    persistTrips();

    console.log(`[Trip Started] ${newTrip.id} for ${newTrip.ambulanceId} -> ${hospital.name}`);

    // Broadcast to ambulance client
    socket.emit("trip:created", newTrip);

    // Alert Destination Hospital
    io.to(`hospital:${hospitalId}`).emit("trip:new", {
      trip: newTrip,
      soundAlert: true,
      message: `URGENT: Ambulance ${newTrip.ambulanceId} incoming with ${newTrip.severity} patient (${newTrip.patientCondition})! ETA: ${newTrip.etaFormatted}`
    });

    // Alert Traffic Control Room
    io.to("traffic-control").emit("traffic:trip_started", {
      trip: newTrip,
      junctions: junctionsState,
      alerts: nearbyJunctions.map((j) => ({
        junctionId: j.id,
        junctionName: j.name,
        ambulanceId: newTrip.ambulanceId,
        tripId: newTrip.id,
        distanceKm: j.distanceKm,
        etaSec: j.etaSec,
        message: `Ambulance ${newTrip.ambulanceId} approaching ${j.name} (Dist: ${j.distanceKm} km, ETA: ${j.formattedEta}). Clear the route!`
      }))
    });
  });

  // Real-time Location Update Event (Emitted by Ambulance)
  socket.on("trip:location_update", (payload) => {
    const { tripId, currentLocation, remainingRoute = [] } = payload;
    const tripIndex = trips.findIndex((t) => t.id === tripId);

    if (tripIndex === -1) return;

    const trip = trips[tripIndex];
    if (trip.status !== "active") return;

    // Update location and recalculate metrics
    trip.currentLocation = currentLocation;
    const distRemaining = calculateRemainingRouteDistance(
      currentLocation,
      remainingRoute.length > 0 ? remainingRoute : [trip.hospitalLocation]
    );
    const etaSec = estimateEtaSeconds(distRemaining);

    trip.distanceRemainingKm = parseFloat(distRemaining.toFixed(2));
    trip.etaSeconds = etaSec;
    trip.etaFormatted = formatEta(etaSec);

    // Check proximity to all junctions (within 2 km)
    const nearbyJunctions = findNearbyJunctions(currentLocation, junctionsState, 2.0);
    const newJunctionAlerts = [];

    nearbyJunctions.forEach((j) => {
      const juncIdx = junctionsState.findIndex((item) => item.id === j.id);
      if (juncIdx !== -1) {
        // If junction is not already cleared, flag as alert
        if (junctionsState[juncIdx].status === "clear") {
          junctionsState[juncIdx].status = "alert";
          junctionsState[juncIdx].activeTripId = trip.id;
          junctionsState[juncIdx].ambulanceId = trip.ambulanceId;
          junctionsState[juncIdx].distanceKm = j.distanceKm;
          junctionsState[juncIdx].etaSec = j.etaSec;

          if (!trip.alertedJunctions.includes(j.id)) {
            trip.alertedJunctions.push(j.id);
          }

          newJunctionAlerts.push({
            junctionId: j.id,
            junctionName: j.name,
            ambulanceId: trip.ambulanceId,
            tripId: trip.id,
            distanceKm: j.distanceKm,
            etaSec: j.etaSec,
            formattedEta: j.formattedEta,
            message: `Ambulance ${trip.ambulanceId} approaching ${j.name} (ETA: ${j.formattedEta}). Clear the route!`
          });
        }
      }
    });

    // Auto-detect arrival if within 40 meters (0.04 km)
    const distToHospital = getDistanceKm(
      currentLocation.lat,
      currentLocation.lng,
      trip.hospitalLocation.lat,
      trip.hospitalLocation.lng
    );

    if (distToHospital <= 0.05) {
      trip.status = "arrived";
      trip.endedAt = new Date().toISOString();
      trip.etaSeconds = 0;
      trip.etaFormatted = "Arrived";
      persistTrips();

      io.to(`hospital:${trip.hospitalId}`).emit("trip:arrived", {
        trip,
        message: `Ambulance ${trip.ambulanceId} has safely arrived at ${trip.hospitalName}!`
      });
      io.to("traffic-control").emit("traffic:trip_ended", {
        trip,
        junctions: junctionsState
      });
      io.to(`ambulance:${trip.id}`).emit("trip:status_changed", trip);
      return;
    }

    // Broadcast live telemetry
    // 1. To the specific hospital
    io.to(`hospital:${trip.hospitalId}`).emit("trip:telemetry", {
      tripId: trip.id,
      ambulanceId: trip.ambulanceId,
      currentLocation: trip.currentLocation,
      distanceRemainingKm: trip.distanceRemainingKm,
      etaSeconds: trip.etaSeconds,
      etaFormatted: trip.etaFormatted
    });

    // 2. To traffic control
    io.to("traffic-control").emit("traffic:telemetry", {
      tripId: trip.id,
      ambulanceId: trip.ambulanceId,
      currentLocation: trip.currentLocation,
      distanceRemainingKm: trip.distanceRemainingKm,
      etaSeconds: trip.etaSeconds,
      etaFormatted: trip.etaFormatted,
      newAlerts: newJunctionAlerts,
      junctions: junctionsState
    });

    // 3. Back to ambulance room / caller
    socket.emit("trip:telemetry_ack", {
      tripId: trip.id,
      distanceRemainingKm: trip.distanceRemainingKm,
      etaFormatted: trip.etaFormatted,
      junctions: junctionsState
    });
  });

  // Traffic Control Action: Acknowledge & Clear Junction (Green Wave)
  socket.on("junction:clear", ({ junctionId, tripId, clearedBy = "Traffic Officer" }) => {
    const juncIndex = junctionsState.findIndex((j) => j.id === junctionId);
    if (juncIndex !== -1) {
      junctionsState[juncIndex].status = "cleared";
      junctionsState[juncIndex].clearedAt = new Date().toISOString();
      junctionsState[juncIndex].clearedBy = clearedBy;

      const junction = junctionsState[juncIndex];
      console.log(`[Junction Cleared] ${junction.name} cleared by ${clearedBy}`);

      // Broadcast green wave / cleared status to ALL rooms
      io.emit("junction:status_updated", {
        junction,
        junctions: junctionsState,
        message: `Green Wave Cleared: ${junction.name} is now open for Ambulance!`
      });
    }
  });

  // Reset Junction to Normal
  socket.on("junction:reset", ({ junctionId }) => {
    const juncIndex = junctionsState.findIndex((j) => j.id === junctionId);
    if (juncIndex !== -1) {
      junctionsState[juncIndex].status = "clear";
      delete junctionsState[juncIndex].activeTripId;
      delete junctionsState[juncIndex].ambulanceId;

      io.emit("junction:status_updated", {
        junction: junctionsState[juncIndex],
        junctions: junctionsState
      });
    }
  });

  // End Trip Event
  socket.on("trip:end", ({ tripId, reason = "Arrived at destination" }) => {
    const tripIndex = trips.findIndex((t) => t.id === tripId);
    if (tripIndex !== -1) {
      const trip = trips[tripIndex];
      trip.status = "arrived";
      trip.endedAt = new Date().toISOString();
      trip.etaSeconds = 0;
      trip.etaFormatted = "Arrived";
      trip.completionReason = reason;

      // Reset any junctions associated with this trip
      junctionsState.forEach((j) => {
        if (j.activeTripId === tripId) {
          j.status = "clear";
          delete j.activeTripId;
          delete j.ambulanceId;
        }
      });

      persistTrips();

      console.log(`[Trip Ended] ${trip.id} completed.`);

      io.to(`hospital:${trip.hospitalId}`).emit("trip:arrived", {
        trip,
        message: `Ambulance ${trip.ambulanceId} completed trip. Patient received!`
      });

      io.to("traffic-control").emit("traffic:trip_ended", {
        trip,
        junctions: junctionsState
      });

      io.emit("junction:status_updated", {
        junctions: junctionsState
      });

      socket.emit("trip:status_changed", trip);
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`====================================================`);
  console.log(`🚑 ClearPath Server running on port ${PORT}`);
  console.log(`📍 Configured for Chandigarh (3 Hospitals, 10 Sector Chowks)`);
  console.log(`====================================================`);
});
