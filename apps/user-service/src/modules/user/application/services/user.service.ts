import type { UserProfile } from '../../domain/entities/user.entity';
import { UserNotFoundError } from '../../domain/errors';
import { IUserRepository } from '../../domain/interfaces/user.repository';
import { IUserService } from '../../domain/interfaces/user.service';

export class UserService implements IUserService {
  constructor(private readonly repo: IUserRepository) {}

  async findById(id: string): Promise<UserProfile> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
