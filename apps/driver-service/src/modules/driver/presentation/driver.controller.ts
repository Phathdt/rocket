import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  ConflictException,
} from '@nestjs/common';
import { CreateDriverDto } from '../domain/dto/create-driver.schema';
import { LocationUpdateDto } from '../domain/dto/location-update.schema';
import { NearbyQueryDto } from '../domain/dto/nearby-query.schema';
import { UpdateStatusDto } from '../domain/dto/update-status.schema';
import { IDriverService } from '../domain/interfaces/driver.service';

@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: IDriverService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDriverDto) {
    return this.driverService.create(dto);
  }

  @Get('nearby')
  findNearby(@Query() query: NearbyQueryDto) {
    return this.driverService.findNearby(
      query.lat,
      query.lng,
      query.radiusKm,
      query.limit,
    );
  }

  @Get('by-user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.driverService.findByUserId(userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.driverService.findById(id);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.driverService.updateStatus(id, dto.status);
  }

  @Post(':id/location')
  @HttpCode(HttpStatus.OK)
  updateLocation(@Param('id') id: string, @Body() dto: LocationUpdateDto) {
    return this.driverService.updateLocation(id, dto.lat, dto.lng);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assign(@Param('id') id: string) {
    const result = await this.driverService.assign(id);
    if (!result.ok) {
      throw new ConflictException('Driver is already being assigned');
    }
    return result;
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  release(@Param('id') id: string) {
    return this.driverService.release(id);
  }
}
