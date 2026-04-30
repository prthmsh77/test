import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PingsService } from './pings.service';
import { BatchPingDto } from './dto/ping.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('pings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pings')
export class PingsController {
  constructor(private readonly pingsService: PingsService) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ingest a batch of GPS pings (up to 100). Idempotent — safe to replay offline queue.',
  })
  // Generous rate limit: each active trekker flushes their offline queue on reconnect.
  @Throttle({ default: { ttl: 60_000, limit: 200 } })
  async ingestBatch(@CurrentUser() user: RequestUser, @Body() dto: BatchPingDto) {
    return this.pingsService.ingestBatch(user.id, dto.pings);
  }

  @Get(':trekId/recent')
  @ApiOperation({ summary: 'Get the most recent pings for a trek (live-track view)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getRecent(@Param('trekId') trekId: string, @Query('limit') limit?: string) {
    return this.pingsService.getRecentPings(trekId, limit ? parseInt(limit, 10) : 100);
  }
}
