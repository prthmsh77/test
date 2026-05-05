import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { LiveTrackGateway } from './live-track.gateway';
import { RedisStreamsConsumer, REDIS_CLIENT } from './redis-streams.consumer';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
          lazyConnect: false,
          maxRetriesPerRequest: 3,
        }),
    },
    LiveTrackGateway,
    RedisStreamsConsumer,
  ],
  exports: [LiveTrackGateway, REDIS_CLIENT],
})
export class LiveTrackModule {}
