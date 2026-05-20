import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

export class TripNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Trip ${id} not found`);
  }
}

export class TripCannotStartException extends ConflictException {
  constructor(status: string) {
    super(`Cannot start trip in status ${status}. Expected ASSIGNED.`);
  }
}

export class TripCannotCompleteException extends ConflictException {
  constructor(status: string) {
    super(`Cannot complete trip in status ${status}. Expected ONGOING.`);
  }
}

export class TripCannotCancelException extends ConflictException {
  constructor(status: string) {
    super(`Cannot cancel trip in status ${status}.`);
  }
}

export class MissingUserIdHeaderException extends BadRequestException {
  constructor() {
    super('Missing x-user-id header');
  }
}
