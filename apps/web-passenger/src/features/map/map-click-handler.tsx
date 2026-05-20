import { useMapEvents } from 'react-leaflet';
import type { LatLng } from 'leaflet';

interface MapClickHandlerProps {
  onPickup: (latlng: LatLng) => void;
  onDropoff: (latlng: LatLng) => void;
  pickupSet: boolean;
  dropoffSet: boolean;
}

/**
 * Invisible component that hooks into react-leaflet's event system.
 * First click sets pickup, second click sets dropoff.
 */
export function MapClickHandler({
  onPickup,
  onDropoff,
  pickupSet,
  dropoffSet,
}: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (!pickupSet) {
        onPickup(e.latlng);
      } else if (!dropoffSet) {
        onDropoff(e.latlng);
      }
    },
  });
  return null;
}
