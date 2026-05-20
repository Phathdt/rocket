import type { User } from '../entities/user.entity';

export abstract class IUserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract create(data: {
    email: string;
    name: string;
    role: string;
    passwordHash: string;
  }): Promise<User>;
}
