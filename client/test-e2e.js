import { io } from "socket.io-client";

console.log("🚀 Starting ClearPath Chandigarh End-to-End Simulation & Verification Test...");

const SERVER_URL = "http://localhost:5000";

const ambulanceSocket = io(SERVER_URL);
const hospitalSocket = io(SERVER_URL);
const trafficSocket = io(SERVER_URL);

let testPassed = {
  hospitalJoined: false,
  trafficJoined: false,
  tripStarted: false,
  hospitalAlertReceived: false,
  trafficAlertReceived: false,
  junctionCleared: false,
  telemetryStreamed: false,
  tripArrived: false
};

// 1. Hospital joins PGIMER room
hospitalSocket.emit("join:hospital", { hospitalId: "hosp_1" });
hospitalSocket.on("hospital:active_trips", (trips) => {
  console.log("✅ [Hospital ER] Joined PGIMER Chandigarh (hospital:hosp_1). Active trips:", trips.length);
  testPassed.hospitalJoined = true;
  checkAndStartTrip();
});

hospitalSocket.on("trip:new", ({ trip, message }) => {
  console.log("🚨 [Hospital ER Audio Alert] Received emergency:", trip.ambulanceId, "| Condition:", trip.patientCondition, "| ETA:", trip.etaFormatted);
  testPassed.hospitalAlertReceived = true;
});

hospitalSocket.on("trip:telemetry", (data) => {
  console.log("📡 [Hospital ER Telemetry] Inbound", data.ambulanceId, "- Distance:", data.distanceRemainingKm, "km | ETA:", data.etaFormatted);
  testPassed.telemetryStreamed = true;
});

hospitalSocket.on("trip:arrived", ({ trip, message }) => {
  console.log("🎉 [Hospital ER Handover] Patient arrived at PGIMER:", trip.ambulanceId, "-", message);
  testPassed.tripArrived = true;
});

// 2. Traffic joins room
trafficSocket.emit("join:traffic");
trafficSocket.on("traffic:initial_state", ({ activeTrips, junctions }) => {
  console.log("✅ [Traffic Command Center] Joined Chandigarh traffic control. Monitored Chowks:", junctions.length);
  testPassed.trafficJoined = true;
  checkAndStartTrip();
});

trafficSocket.on("traffic:trip_started", ({ trip, alerts }) => {
  console.log("⚠️ [Traffic Alert] Active trip started:", trip.ambulanceId, "Heading to:", trip.hospitalName);
  testPassed.trafficAlertReceived = true;
  if (alerts && alerts.length > 0) {
    clearFirstAlert(alerts[0], trip.id);
  }
});

trafficSocket.on("traffic:telemetry", ({ tripId, newAlerts }) => {
  if (newAlerts && newAlerts.length > 0) {
    console.log("🚨 [Traffic 2km Proximity Triggered En Route]:", newAlerts[0].message);
    clearFirstAlert(newAlerts[0], tripId);
  }
});

let clearedOnce = false;
function clearFirstAlert(alert, tripId) {
  if (!clearedOnce) {
    clearedOnce = true;
    console.log("⚡ [Traffic Officer Action] Clicking ACKNOWLEDGE & CLEAR ROUTE for Chowk:", alert.junctionName || alert.junctionId);
    trafficSocket.emit("junction:clear", {
      junctionId: alert.junctionId,
      tripId: tripId,
      clearedBy: "Traffic Officer Sharma (Chandigarh Traffic HQ)"
    });
  }
}

trafficSocket.on("junction:status_updated", ({ junction, message }) => {
  if (junction && junction.status === "cleared") {
    console.log("🟢 [Green Wave Active across Chandigarh Network]:", junction.name, "is CLEARED for Ambulance!");
    testPassed.junctionCleared = true;
  }
});

let started = false;
function checkAndStartTrip() {
  if (testPassed.hospitalJoined && testPassed.trafficJoined && !started) {
    started = true;
    setTimeout(startAmbulanceTrip, 400);
  }
}

function startAmbulanceTrip() {
  console.log("\n🚑 [Ambulance Cockpit] Unit AMB-108 starting emergency trip from Sukhna Lake to PGIMER Chandigarh...");

  const mockRoute = [
    { lat: 30.7421, lng: 76.8188 }, // Sukhna Lake Promenade
    { lat: 30.7455, lng: 76.7925 }, // Press Chowk (triggers 2km alert)
    { lat: 30.7512, lng: 76.7885 }, // Matka Chowk
    { lat: 30.7610, lng: 76.7780 }, // PGI Chowk Roundabout
    { lat: 30.7656, lng: 76.7745 }  // PGIMER Emergency Entrance
  ];

  ambulanceSocket.emit("trip:start", {
    ambulanceId: "AMB-108",
    patientCondition: "Acute ST-Elevation Myocardial Infarction (Cardiac Code Red)",
    severity: "Critical",
    hospitalId: "hosp_1",
    startLocation: mockRoute[0],
    route: mockRoute,
    currentLocation: mockRoute[0]
  });

  ambulanceSocket.on("trip:created", (trip) => {
    console.log("✅ [Ambulance] Trip created successfully:", trip.id, "ETA:", trip.etaFormatted);
    testPassed.tripStarted = true;

    // Simulate location updates along route
    let step = 1;
    const simInterval = setInterval(() => {
      if (step < mockRoute.length) {
        const pos = mockRoute[step];
        const remaining = mockRoute.slice(step);
        ambulanceSocket.emit("trip:location_update", {
          tripId: trip.id,
          currentLocation: pos,
          remainingRoute: remaining
        });
        step++;
      } else {
        clearInterval(simInterval);
        ambulanceSocket.emit("trip:end", {
          tripId: trip.id,
          reason: "Delivered to PGIMER Advanced Cardiac Emergency"
        });

        setTimeout(() => {
          console.log("\n==================================================");
          console.log("📊 CLEARPATH CHANDIGARH E2E TEST SUMMARY:");
          console.log("==================================================");
          console.table(testPassed);
          const allPass = Object.values(testPassed).every(Boolean);
          if (allPass) {
            console.log("🎉 ALL CHANDIGARH EMERGENCY COORDINATION CHECKS PASSED!");
          }
          process.exit(allPass ? 0 : 1);
        }, 1200);
      }
    }, 600);
  });
}
