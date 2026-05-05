import { Module } from '@nestjs/common';
import { PingsController } from './pings.controller';
import { PingsService } from './pings.service';
import { TreksModule } from '../treks/treks.module';
import { LiveTrackModule } from '../live-track/live-track.module';

@Module({
  imports: [TreksModule, LiveTrackModule],
  controllers: [PingsController],
  providers: [PingsService],
})
export class PingsModule {}
