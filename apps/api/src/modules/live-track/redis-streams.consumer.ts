import { Injectable, OnModuleInit, OnModuleDestroy, Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { LiveTrackGateway } from './live-track.gateway';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const STREAM_KEY = 'shikhar:pings';
const GROUP = 'live-track';
const CONSUMER = 'ws-worker-1';

@Injectable()
export class RedisStreamsConsumer implements OnModuleInit, OnModuleDestroy {
  private running = false;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly gateway: LiveTrackGateway,
  ) {}

  async onModuleInit() {
    await this.ensureGroup();
    this.running = true;
    void this.consume();
  }

  onModuleDestroy() {
    this.running = false;
  }

  private async ensureGroup() {
    try {
      await this.redis.xgroup('CREATE', STREAM_KEY, GROUP, '$', 'MKSTREAM');
    } catch (err: unknown) {
      if (!(err instanceof Error) || !err.message.includes('BUSYGROUP')) throw err;
    }
  }

  private async consume() {
    while (this.running) {
      try {
        const result = await (this.redis as any).xreadgroup(
          'GROUP', GROUP, CONSUMER,
          'COUNT', '20',
          'BLOCK', '2000',
          'STREAMS', STREAM_KEY, '>',
        ) as Array<[string, Array<[string, string[]]>]> | null;

        if (!result) continue;

        for (const [, messages] of result) {
          for (const [id, fields] of messages) {
            this.processMessage(fields);
            await this.redis.xack(STREAM_KEY, GROUP, id);
          }
        }
      } catch {
        await new Promise<void>((r) => setTimeout(r, 1000));
      }
    }
  }

  private processMessage(fields: string[]) {
    const obj: Record<string, string> = {};
    for (let i = 0; i < fields.length - 1; i += 2) {
      obj[fields[i]] = fields[i + 1];
    }

    const { trek_id, lat, lng, altitude_meters, recorded_at, off_route, altitude_alert } = obj;
    if (!trek_id || !lat || !lng) return;

    this.gateway.emitPingToTrek(trek_id, {
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      altitudeMeters: altitude_meters ? parseFloat(altitude_meters) : undefined,
      recordedAt: recorded_at ?? new Date().toISOString(),
      offRoute: off_route === 'true',
      altitudeAlert: altitude_alert || null,
    });
  }
}
