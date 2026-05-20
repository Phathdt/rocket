import type { UserProfile } from '../entities/user.entity';

export abstract class IUserService {
  abstract findById(id: string): Promise<UserProfile>;
}
