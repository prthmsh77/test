import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { TrailsService } from './trails.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

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

  @Get(':id/tile-manifest')
  @ApiOperation({
    summary: 'Get OSM tile manifest for offline caching — bbox, zoom 10–14, ~200–600 tiles with 5 km route buffer',
  })
  getTileManifest(@Param('id') id: string) {
    return this.trailsService.getTileManifest(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/edits')
  @ApiOperation({ summary: 'Propose a WikiGIS edit (GeoJSON) for a trail' })
  proposeEdit(
    @Param('id') id: string,
    @Body('routeGeom') routeGeom: any,
    @CurrentUser() user: RequestUser,
  ) {
    return this.trailsService.proposeEdit(id, user.id, routeGeom);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('edits/:editId/merge')
  @ApiOperation({ summary: 'Merge a proposed WikiGIS edit into the live trail using token-diffing' })
  mergeEdit(
    @Param('editId') editId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.trailsService.mergeEdit(editId, user.id);
  }
}
