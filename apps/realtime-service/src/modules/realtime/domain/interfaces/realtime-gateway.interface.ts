export abstract class IRealtimeGateway {
  abstract emitTripUpdate(tripId: string, payload: Record<string, unknown>): void;
  abstract emitDriverLocation(
    tripId: string,
    payload: { lat: number; lng: number; driverId: string },
  ): void;
}
