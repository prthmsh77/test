import { Module } from '@nestjs/common';
import { TreksController } from './treks.controller';
import { TreksService } from './treks.service';

@Module({
  controllers: [TreksController],
  providers: [TreksService],
  exports: [TreksService],
})
export class TreksModule {}
