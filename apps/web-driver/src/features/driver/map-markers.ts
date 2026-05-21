import L from 'leaflet';

/*
 * Custom Leaflet markers. Emoji markers render inconsistently across
 * platforms, so the driver uses an inline SVG car puck (green, with a
 * pulsing "you are live" ring) and trip endpoints use lettered pins.
 */

const BRAND_ORANGE = '#f97316';
const BRAND_BLUE = '#2563eb';
const DRIVER_GREEN = '#15803d';

/** Circular lettered pin (A = pickup, B = dropoff) — matches the passenger app. */
function letterPin(letter: string, color: string): L.DivIcon {
  return L.divIcon({
    className: 'trip-endpoint-marker',
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:28px;height:28px;border-radius:9999px;
      background:${color};color:#fff;
      font:700 13px/1 Lexend,system-ui,sans-serif;
      border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,.35);
    ">${letter}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export const pickupIcon = letterPin('A', BRAND_ORANGE);
export const dropoffIcon = letterPin('B', BRAND_BLUE);

const carSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;

/** The driver's own position — draggable green puck with a pulsing ring. */
export const selfDriverIcon = L.divIcon({
  className: 'driver-marker',
  html: `<div style="position:relative;width:44px;height:44px;cursor:grab;">
    <div class="driver-marker-pulse" style="position:absolute;inset:0;border-radius:9999px;background:${DRIVER_GREEN};"></div>
    <div style="
      position:absolute;inset:6px;display:flex;align-items:center;justify-content:center;
      border-radius:9999px;background:${DRIVER_GREEN};border:2px solid #fff;
      box-shadow:0 2px 8px rgba(15,23,42,.4);
    ">${carSvg}</div>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -24],
});
