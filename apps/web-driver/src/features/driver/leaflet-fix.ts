/**
 * Fixes the broken default icon paths when Leaflet is bundled with Vite.
 * Import this module once before rendering any MapContainer.
 * Uses new URL() so TypeScript does not need PNG type declarations.
 */
import L from 'leaflet';

const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href;
const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href;
const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href;

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
