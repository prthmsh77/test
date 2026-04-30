import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TrailsService } from './trails.service';

@ApiTags('trails')
@Controller('trails')
export class TrailsController {
  constructor(private readonly trailsService: TrailsService) {}

  @Get()
  @ApiOperation({ summary: 'List published trails with optional filters' })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'difficulty', required: false })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('region') region?: string,
    @Query('difficulty') difficulty?: string,
    @Query('search') search?: string,
  ) {
    return this.trailsService.findAll({ region, difficulty, search });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a trail by slug including GeoJSON route' })
  findOne(@Param('slug') slug: string) {
    return this.trailsService.findBySlug(slug);
  }

  @Get(':id/waypoints')
  @ApiOperation({ summary: 'Get waypoints for a trail (camps, water, helipad, network spots)' })
  getWaypoints(@Param('id') id: string) {
    return this.trailsService.getWaypoints(id);
  }
}
