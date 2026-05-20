import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './application/services/user.service';
import { IUserRepository } from './domain/interfaces/user.repository';
import { IUserService } from './domain/interfaces/user.service';
import { UserPrismaRepository } from './infrastructure/repositories/user.prisma-repository';
import { UserController } from './presentation/user.controller';

@Module({
  providers: [
    {
      provide: IUserRepository,
      useFactory: (prisma: PrismaService) => new UserPrismaRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: IUserService,
      useFactory: (repo: IUserRepository) => new UserService(repo),
      inject: [IUserRepository],
    },
  ],
  controllers: [UserController],
  exports: [IUserRepository, IUserService],
})
export class UserModule {}
