import {
  Controller, Post, Patch, Get, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TreksService } from './treks.service';
import { CreateTrekDto, StartTrekDto, EndTrekDto, ExtendTrekDto, SosDto } from './dto/treks.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

@ApiTags('treks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('treks')
export class TreksController {
  constructor(private readonly treksService: TreksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new trek plan (PLANNED state)' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateTrekDto) {
    return this.treksService.createTrek(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List treks for the authenticated user' })
  @ApiQuery({ name: 'status', required: false, enum: ['PLANNED', 'ACTIVE', 'COMPLETED', 'OVERDUE', 'INCIDENT'] })
  list(@CurrentUser() user: RequestUser, @Query('status') status?: string) {
    return this.treksService.listUserTreks(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single trek by ID' })
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.treksService.findById(id, user.id);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start a planned trek — generates live-track URL, notifies E-Contacts, starts escalation workflow' })
  start(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.treksService.startTrek(user.id, id);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End/check-out of an active trek with PIN 2FA' })
  @HttpCode(HttpStatus.OK)
  end(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: EndTrekDto) {
    return this.treksService.endTrek(user.id, id, dto.pin);
  }

  @Patch(':id/extend')
  @ApiOperation({ summary: 'Extend the planned end time of an active trek (resets escalation timers)' })
  extend(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: ExtendTrekDto) {
    return this.treksService.extendTrek(user.id, id, dto.newPlannedEndAt);
  }

  @Post(':id/sos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger SOS — HELP (family alert), MEDICAL (Sentinels), CRITICAL (ERSS-112). Always FREE.',
  })
  // SOS is safety-critical: allow up to 30 calls per minute to prevent throttle blocking distress situations.
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  sos(@CurrentUser() user: RequestUser, @Param('id') id: string, @Body() dto: SosDto) {
    return this.treksService.triggerSos(user.id, { ...dto, trekId: id });
  }
}
