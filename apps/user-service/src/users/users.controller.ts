import { Controller, Get, Param } from '@nestjs/common';
import { UsersService, UserProfile } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserProfile> {
    return this.usersService.findById(id);
  }
}
