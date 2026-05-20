import { ConflictException, UnauthorizedException } from '@nestjs/common';

export class EmailAlreadyRegisteredError extends ConflictException {
  constructor() {
    super('Email already registered');
  }
}

export class InvalidCredentialsError extends UnauthorizedException {
  constructor() {
    super('Invalid credentials');
  }
}
