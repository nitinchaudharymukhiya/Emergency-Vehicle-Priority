import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { KANNUR_CENTER } from "../data/constants";

// Fix standard Leaflet icon paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// Custom Icon Creators
function createAmbulanceIcon(ambulanceId = "AMB", severity = "Critical") {
  const isCritical = severity === "Critical";
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        <div class="absolute w-12 h-12 rounded-full ${
          isCritical ? "bg-red-500/40 animate-ping" : "bg-amber-500/40 animate-ping"
        }"></div>
        <div class="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-slate-900 to-red-950 border-2 ${
          isCritical ? "border-red-500 shadow-lg shadow-red-500/80" : "border-amber-500 shadow-lg shadow-amber-500/80"
        } flex items-center justify-center text-white">
          <svg class="w-5 h-5 text-red-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 14h-4v-4h-2v4H9v2h4v4h2v-4h4v-2z"/>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        </div>
        <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/95 border border-red-500/50 text-[10px] font-mono font-bold text-red-300 shadow-md">
          🚑 ${ambulanceId}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
}

function createHospitalIcon(hospital) {
  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2 group">
        <div class="relative w-9 h-9 rounded-xl bg-slate-900 border-2 border-cyan-400 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/40">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div class="absolute -bottom-5 whitespace-nowrap px-2 py-0.5 rounded bg-slate-950/90 border border-cyan-500/40 text-[10px] font-bold text-cyan-300 shadow">
          🏥 ${hospital.name ? hospital.name.split(" ")[0] : "Hospital"}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

function createJunctionIcon(junction) {
  const isAlert = junction.status === "alert";
  const isCleared = junction.status === "cleared";

  let bgClass = "bg-slate-900 border-slate-700 text-slate-400";
  let pulseClass = "";
  let iconSvg = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9"/>
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6l4 2"/>
    </svg>
  `;

  if (isAlert) {
    bgClass = "bg-red-950 border-2 border-red-500 text-red-300 shadow-lg shadow-red-500/80";
    pulseClass = "absolute w-12 h-12 rounded-full bg-red-500/50 animate-ping";
    iconSvg = `
      <svg class="w-4 h-4 text-red-400 animate-bounce" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    `;
  } else if (isCleared) {
    bgClass = "bg-emerald-950 border-2 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/70";
    pulseClass = "absolute w-10 h-10 rounded-full bg-emerald-500/30 animate-ping";
    iconSvg = `
      <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
      </svg>
    `;
  }

  return L.divIcon({
    className: "custom-leaflet-marker",
    html: `
      <div class="relative flex items-center justify-center -translate-x-1/2 -translate-y-1/2">
        ${pulseClass ? `<div class="${pulseClass}"></div>` : ""}
        <div class="relative w-8 h-8 rounded-full ${bgClass} flex items-center justify-center">
          ${iconSvg}
        </div>
        <div class="absolute -bottom-5 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/90 border ${
          isAlert
            ? "border-red-500 text-red-300 animate-pulse font-bold"
            : isCleared
            ? "border-emerald-500 text-emerald-300 font-bold"
            : "border-slate-800 text-slate-400 text-[9px]"
        } text-[10px] shadow">
          🚦 ${junction.name.split(" ")[0]}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

export default function MapComponent({
  center = [KANNUR_CENTER.lat, KANNUR_CENTER.lng],
  zoom = 13,
  ambulances = [],
  hospitals = [],
  junctions = [],
  activeRoute = null,
  startLocation = null,
  onMapClick = null,
  focusLocation = null,
  height = "100%",
  className = ""
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({
    ambulances: new Map(),
    hospitals: new Map(),
    junctions: new Map(),
    routePolyline: null,
    startMarker: null
  });

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true,
        attributionControl: false
      });

      // CartoDB Dark Matter tiles for a tactical look
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd"
        }
      ).addTo(map);

      // Add custom dark overlay for tactical feel
      const attribution = L.control.attribution({ position: "bottomright" });
      attribution.addAttribution('&copy; <a href="https://openstreetmap.org" target="_blank">OSM</a> | ClearPath');
      attribution.addTo(map);

      map.on("click", (e) => {
        if (onMapClick) {
          onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });

      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup on unmount if needed
    };
  }, []);

  // Handle focusLocation change
  useEffect(() => {
    if (mapInstanceRef.current && focusLocation) {
      mapInstanceRef.current.flyTo(
        [focusLocation.lat, focusLocation.lng],
        focusLocation.zoom || 14,
        { duration: 1.2 }
      );
    }
  }, [focusLocation]);

  // Update Hospitals
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear stale hospital markers
    markersRef.current.hospitals.forEach((marker) => marker.remove());
    markersRef.current.hospitals.clear();

    hospitals.forEach((h) => {
      if (h.lat && h.lng) {
        const marker = L.marker([h.lat, h.lng], {
          icon: createHospitalIcon(h)
        }).addTo(map);

        marker.bindPopup(`
          <div class="p-2 text-slate-900 font-sans text-xs">
            <h4 class="font-bold text-sm text-cyan-700">${h.name}</h4>
            <p class="text-slate-600">${h.locationName || "Kannur"}</p>
            <div class="mt-1 flex items-center gap-1 font-semibold text-emerald-700">
              🛏️ ${h.availableBeds || h.bedsAvailable || 15} ER Beds Available
            </div>
            <p class="text-[10px] text-slate-500 mt-1">📞 ${h.emergencyPhone || "108"}</p>
          </div>
        `);

        markersRef.current.hospitals.set(h.id, marker);
      }
    });
  }, [hospitals]);

  // Update Junctions
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear and redraw junctions to update visual status
    markersRef.current.junctions.forEach((marker) => marker.remove());
    markersRef.current.junctions.clear();

    junctions.forEach((j) => {
      if (j.lat && j.lng) {
        const marker = L.marker([j.lat, j.lng], {
          icon: createJunctionIcon(j)
        }).addTo(map);

        const statusLabel =
          j.status === "alert"
            ? "<span class='text-red-600 font-bold'>⚠️ ALERT - APPROACHING AMBULANCE</span>"
            : j.status === "cleared"
            ? "<span class='text-emerald-600 font-bold'>✅ GREEN WAVE CLEARED</span>"
            : "<span class='text-slate-600'>Clear / Normal Traffic</span>";

        marker.bindPopup(`
          <div class="p-2 text-slate-900 font-sans text-xs min-w-[160px]">
            <h4 class="font-bold text-sm">${j.name}</h4>
            <div class="mt-1">${statusLabel}</div>
            ${
              j.ambulanceId
                ? `<p class="text-xs text-red-600 mt-1 font-semibold">Priority for: ${j.ambulanceId}</p>`
                : ""
            }
          </div>
        `);

        markersRef.current.junctions.set(j.id, marker);
      }
    });
  }, [junctions]);

  // Update Ambulances
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentIds = new Set(ambulances.map((a) => a.id || a.ambulanceId));

    // Remove deleted ambulances
    markersRef.current.ambulances.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.ambulances.delete(id);
      }
    });

    // Add or update ambulance markers
    ambulances.forEach((amb) => {
      const ambId = amb.id || amb.ambulanceId;
      const loc = amb.currentLocation || amb.startLocation;
      if (!loc || !loc.lat || !loc.lng) return;

      const latLng = [loc.lat, loc.lng];

      if (markersRef.current.ambulances.has(ambId)) {
        const marker = markersRef.current.ambulances.get(ambId);
        marker.setLatLng(latLng);
        marker.setIcon(createAmbulanceIcon(amb.ambulanceId, amb.severity));
      } else {
        const marker = L.marker(latLng, {
          icon: createAmbulanceIcon(amb.ambulanceId, amb.severity),
          zIndexOffset: 1000
        }).addTo(map);

        marker.bindPopup(`
          <div class="p-2 text-slate-900 font-sans text-xs">
            <h4 class="font-bold text-sm text-red-600">Ambulance ${amb.ambulanceId}</h4>
            <p><strong>Patient:</strong> ${amb.patientCondition}</p>
            <p><strong>Severity:</strong> <span class="text-red-600 font-semibold">${amb.severity}</span></p>
            <p><strong>ETA:</strong> ${amb.etaFormatted || "Calculating..."}</p>
          </div>
        `);

        markersRef.current.ambulances.set(ambId, marker);
      }
    });
  }, [ambulances]);

  // Update Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (markersRef.current.routePolyline) {
      markersRef.current.routePolyline.remove();
      markersRef.current.routePolyline = null;
    }

    if (activeRoute && activeRoute.length > 0) {
      const latLngs = activeRoute.map((p) => [p.lat, p.lng]);

      // Outer glow polyline
      const glowLine = L.polyline(latLngs, {
        color: "#ef4444",
        weight: 8,
        opacity: 0.35,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      // Inner crisp polyline
      const innerLine = L.polyline(latLngs, {
        color: "#38bdf8",
        weight: 4,
        opacity: 0.9,
        dashArray: "8, 6",
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      const group = L.featureGroup([glowLine, innerLine]);
      markersRef.current.routePolyline = group;

      // Fit bounds with smooth padding
      map.fitBounds(group.getBounds(), {
        padding: [40, 40],
        maxZoom: 15
      });
    }
  }, [activeRoute]);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-slate-800/80 shadow-2xl ${className}`} style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
