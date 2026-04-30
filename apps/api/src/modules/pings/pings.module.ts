import { Module } from '@nestjs/common';
import { PingsController } from './pings.controller';
import { PingsService } from './pings.service';
import { TreksModule } from '../treks/treks.module';

@Module({
  imports: [TreksModule],
  controllers: [PingsController],
  providers: [PingsService],
})
export class PingsModule {}
