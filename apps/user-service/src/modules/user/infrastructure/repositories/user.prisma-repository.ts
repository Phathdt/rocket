import { PrismaService } from '../../../prisma/prisma.service';
import type { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/interfaces/user.repository';

function toUser(row: {
  id: string;
  email: string;
  name: string;
  role: string;
  passwordHash: string;
  createdAt: Date;
}): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    passwordHash: row.passwordHash,
    createdAt: row.createdAt,
  };
}

export class UserPrismaRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } });
    return row ? toUser(row) : null;
  }

  async create(data: {
    email: string;
    name: string;
    role: string;
    passwordHash: string;
  }): Promise<User> {
    const row = await this.prisma.user.create({ data });
    return toUser(row);
  }
}
