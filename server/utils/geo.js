// Geospatial utilities for distance, proximity and ETA calculations

/**
 * Calculates Great-Circle distance between two coordinates in kilometers using Haversine formula
 */
export function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimates remaining route distance (in km) from current position index to destination along coordinates
 */
export function calculateRemainingRouteDistance(currentCoord, remainingRouteCoords = []) {
  if (!remainingRouteCoords || remainingRouteCoords.length === 0) {
    return 0;
  }
  let totalKm = getDistanceKm(
    currentCoord.lat,
    currentCoord.lng,
    remainingRouteCoords[0].lat,
    remainingRouteCoords[0].lng
  );

  for (let i = 0; i < remainingRouteCoords.length - 1; i++) {
    totalKm += getDistanceKm(
      remainingRouteCoords[i].lat,
      remainingRouteCoords[i].lng,
      remainingRouteCoords[i + 1].lat,
      remainingRouteCoords[i + 1].lng
    );
  }
  return Math.max(0.05, totalKm);
}

/**
 * Estimates ETA in seconds given distance in km and assumed ambulance speed (default 45-50 km/h in city)
 */
export function estimateEtaSeconds(distanceKm, speedKmh = 48) {
  if (distanceKm <= 0.05) return 0;
  const hours = distanceKm / speedKmh;
  return Math.round(hours * 3600);
}

/**
 * Formats ETA seconds into human-readable string (e.g. "4 min 30 sec" or "45 sec")
 */
export function formatEta(seconds) {
  if (seconds <= 0) return "Arrived";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

/**
 * Finds all junctions within thresholdKm (default 2.0 km) of current ambulance location
 */
export function findNearbyJunctions(currentLoc, junctions, thresholdKm = 2.0) {
  return junctions
    .map((j) => {
      const distKm = getDistanceKm(currentLoc.lat, currentLoc.lng, j.lat, j.lng);
      const etaSec = estimateEtaSeconds(distKm);
      return {
        ...j,
        distanceKm: parseFloat(distKm.toFixed(2)),
        etaSec,
        formattedEta: formatEta(etaSec),
        isWithinThreshold: distKm <= thresholdKm
      };
    })
    .filter((j) => j.isWithinThreshold)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
