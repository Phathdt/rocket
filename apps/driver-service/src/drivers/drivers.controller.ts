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
import { DriversService } from './drivers.service';
import {
  CreateDriverDto,
  UpdateStatusDto,
  LocationUpdateDto,
  NearbyQueryDto,
} from './dto';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateDriverDto) {
    return this.driversService.create(dto);
  }

  @Get('nearby')
  findNearby(@Query() query: NearbyQueryDto) {
    return this.driversService.findNearby(
      query.lat,
      query.lng,
      query.radiusKm,
      query.limit,
    );
  }

  @Get('by-user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.driversService.findByUserId(userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.driversService.updateStatus(id, dto.status);
  }

  @Post(':id/location')
  @HttpCode(HttpStatus.OK)
  updateLocation(@Param('id') id: string, @Body() dto: LocationUpdateDto) {
    return this.driversService.updateLocation(id, dto.lat, dto.lng);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  async assign(@Param('id') id: string) {
    const result = await this.driversService.assign(id);
    if (!result.ok) {
      throw new ConflictException('Driver is already being assigned');
    }
    return result;
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  release(@Param('id') id: string) {
    return this.driversService.release(id);
  }
}
