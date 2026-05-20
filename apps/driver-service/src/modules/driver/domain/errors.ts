import { ConflictException, NotFoundException } from '@nestjs/common';

export class DriverNotFoundError extends NotFoundException {
  constructor(identifier: string) {
    super(`Driver ${identifier} not found`);
  }
}

export class DriverAlreadyExistsError extends ConflictException {
  constructor(userId: string) {
    super(`Driver profile for userId=${userId} already exists`);
  }
}

export class DriverNotAvailableError extends ConflictException {
  constructor(message: string) {
    super(message);
  }
}
