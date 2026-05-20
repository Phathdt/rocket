import type { TripEvent } from '@rocket/contracts';

export abstract class ITripEventsPublisher {
  abstract publish(event: TripEvent): Promise<void>;
}
