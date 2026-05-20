// Random-walk movement around a center point. KISS: no real routing.

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6371000;
const DEG_PER_M_LAT = 360 / (2 * Math.PI * EARTH_RADIUS_M);

// Meters of longitude per degree shrink toward the poles.
function degPerMeterLng(lat: number): number {
  return DEG_PER_M_LAT / Math.cos((lat * Math.PI) / 180);
}

// Pick a random start point uniformly within radiusKm of the center.
export function randomStart(center: LatLng, radiusKm: number): LatLng {
  const radiusM = radiusKm * 1000;
  const dist = Math.sqrt(Math.random()) * radiusM;
  const angle = Math.random() * 2 * Math.PI;
  const dLat = dist * Math.sin(angle) * DEG_PER_M_LAT;
  const dLng = dist * Math.cos(angle) * degPerMeterLng(center.lat);
  return { lat: center.lat + dLat, lng: center.lng + dLng };
}

// Next position: a small random step (default ~30-80m per tick).
export function nextPosition(current: LatLng, stepMeters = 60): LatLng {
  const dist = stepMeters * (0.5 + Math.random());
  const angle = Math.random() * 2 * Math.PI;
  const dLat = dist * Math.sin(angle) * DEG_PER_M_LAT;
  const dLng = dist * Math.cos(angle) * degPerMeterLng(current.lat);
  return { lat: current.lat + dLat, lng: current.lng + dLng };
}

export function fmt(p: LatLng): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}
