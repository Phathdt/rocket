import { Controller, Get, Param } from '@nestjs/common';
import type { UserProfile } from '../domain/entities/user.entity';
import { IUserService } from '../domain/interfaces/user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: IUserService) {}

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserProfile> {
    return this.userService.findById(id);
  }
}
