# 🚑 ClearPath — Real-Time Emergency Ambulance & Traffic Coordination System (Chandigarh)

**ClearPath** is a full-stack emergency response system designed to drastically reduce ambulance transit times through coordinated Green Wave traffic clearance.

Configured for **Chandigarh, India**, the system integrates major apex hospitals (PGIMER, GMCH-32, GMSH-16) and key traffic roundabouts (Chowks) along primary emergency corridors like Madhya Marg, Jan Marg, and Dakshin Marg.

---

## 🏗️ Architecture & Three Synchronized Roles

```
   ┌─────────────────────────────────────────────────────────────┐
   │                     CLEARPATH CHANDIGARH                    │
   ├───────────────────┬─────────────────────┬───────────────────┤
   │  🚑 Ambulance     │   🏥 Hospital ER    │  🚦 Traffic       │
   │   (/ambulance)    │    (/hospital)      │   (/traffic)      │
   └─────────┬─────────┴──────────┬──────────┴─────────┬─────────┘
             │                    │                    │
             └─────────────┐      │      ┌─────────────┘
                           ▼      ▼      ▼
                ┌───────────────────────────────────┐
                │   WebSocket Real-Time Gateway     │
                │      (Socket.IO + Express)        │
                │     • Room: hospital:{id}         │
                │     • Room: traffic-control       │
                │     • 2 km Junction Geo-Radar     │
                └─────────────────┬─────────────────┘
                                  ▼
                ┌───────────────────────────────────┐
                │       In-Memory State Engine      │
                │     + trips.json Persistence      │
                │ • 3 Hospitals • 10 Sector Chowks  │
                └───────────────────────────────────┘
```

- **Backend**: Node.js, Express, Socket.IO (room-based dispatching & geospatial proximity engine)
- **Frontend**: React 18 (Vite), Tailwind CSS (responsive dark emergency theme), Lucide Icons, Canvas Confetti
- **Maps & Routing**: Leaflet, OpenStreetMap, OSRM Public Driving Route API with intelligent interpolation fallback
- **Audio Synthesizer**: Web Audio API oscillator synthesis (sirens, traffic warning beeps, arrival chimes)
- **Storage**: In-memory active session store with automatic JSON file persistence (`server/data/trips.json`)

---

## 📍 Seed Data — Chandigarh, India

### 🏥 Apex Hospitals
1. **PGIMER (Post Graduate Institute)** (Sector 12, Chandigarh — `30.7656, 76.7745`) — Level 1 Advanced Trauma & Apex Cardiac Centre (28 Beds, 8 ICU)
2. **GMCH-32 (Govt Medical College Hospital)** (Sector 32, Chandigarh — `30.7088, 76.7725`) — Emergency Resuscitation & Multispeciality Unit (20 Beds, 5 ICU)
3. **GMSH-16 (Civil Hospital)** (Sector 16, Chandigarh — `30.7490, 76.7820`) — 24/7 Rapid Emergency Care Centre (15 Beds, 4 ICU)

### 🚦 Monitored Sector Chowks (10 Points)
1. **Matka Chowk (Sectors 9/10/16/17)** (`30.7512, 76.7885`)
2. **Tribune Chowk (Dakshin Marg)** (`30.7032, 76.7865`)
3. **Transport Chowk (Madhya Marg)** (`30.7245, 76.8120`)
4. **Aroma Chowk (Sectors 21/22)** (`30.7320, 76.7760`)
5. **Piccadilly Chowk (Sectors 22/34/35)** (`30.7230, 76.7640`)
6. **Kisan Bhawan Chowk (Sectors 35/43)** (`30.7180, 76.7520`)
7. **Sector 17/18 Light Point (Jan Marg)** (`30.7410, 76.7830`)
8. **PGI Chowk / Sector 11-12 Roundabout** (`30.7610, 76.7780`)
9. **Housing Board Chowk (Panchkula Border)** (`30.7190, 76.8350`)
10. **Press Chowk (Madhya Marg)** (`30.7455, 76.7925`)

---

## 🚀 Quick Setup & 1-Click Launcher

### ⚡ Option 1: 1-Click Launcher (Windows)
Simply double-click [`start-clearpath.bat`](file:///c:/Users/overp/end%20sem/start-clearpath.bat) or [`run.bat`](file:///c:/Users/overp/end%20sem/run.bat) in the project folder.
It will automatically:
1. Check & install any missing dependencies for both server and client
2. Launch the backend server on `http://localhost:5000`
3. Launch the frontend client on `http://localhost:5173`
4. Automatically open your browser to the **Synchronized Split-Screen Command Center** (`http://localhost:5173/split`)

---

### 🛠️ Option 2: Manual Terminal Startup

#### 1. Install Dependencies
```bash
# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
```

#### 2. Start Backend Server
```bash
cd server
npm start
# Runs on http://localhost:5000
```

#### 3. Start Frontend Client
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

---

## 🖥️ Interactive Demo Walkthrough

### 🌟 Enhanced Split-Screen Demo (`http://localhost:5173/split`)
For presentations and live review:
1. Select one of the preset Chandigarh mission scenarios:
   - **Scenario A**: *Sukhna Lake ➔ PGIMER (Cardiac Emergency via Madhya Marg)*
   - **Scenario B**: *Elante Mall ➔ GMCH-32 (Highway Trauma via Purv Marg)*
   - **Scenario C**: *IT Park ➔ GMSH-16 (Pediatric Emergency via Sector 17)*
2. Click **"LAUNCH EMERGENCY MISSION"**.
3. Observe all 3 roles updating concurrently in real-time:
   - **Ambulance Cockpit**: Route navigation, live ETA, patient vitals simulation (Heart Rate, BP, SpO2), speed control (1x, 2x, 4x, 8x).
   - **Hospital ER Dashboard**: Audible siren, countdown timer, trauma bay prep, arrival confetti.
   - **Traffic Command Center**: 2 km proximity warnings, 1-click **"CLEAR GREEN WAVE"** button, and optional **Auto-Clear Green Wave** mode.
4. Review the live **Real-Time Event Stream Ticker** at the bottom logging socket events.
5. Switch between **"3-Panel Cockpit"** and **"Master Tactical Map"** views.

---

## 🧪 Automated Verification Test

Run the full end-to-end integration test suite:
```bash
cd client
node test-e2e.js
```
```
┌───────────────────────┬────────┐
│ (index)               │ Values │
├───────────────────────┼────────┤
│ hospitalJoined        │ true   │
│ trafficJoined         │ true   │
│ tripStarted           │ true   │
│ hospitalAlertReceived │ true   │
│ trafficAlertReceived  │ true   │
│ junctionCleared       │ true   │
│ telemetryStreamed     │ true   │
│ tripArrived           │ true   │
└───────────────────────┴────────┘
🎉 ALL CHANDIGARH EMERGENCY COORDINATION CHECKS PASSED!
```
