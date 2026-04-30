import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';
import { TreksService } from '../treks/treks.service';
import { AMS_ALTITUDE_THRESHOLDS_M } from '@shikhar/shared';
import type { PingDto } from './dto/ping.dto';

@Injectable()
export class PingsService {
  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly treksService: TreksService,
  ) {}

  /**
   * Ingest a batch of GPS pings.
   * Idempotent: uses INSERT ... ON CONFLICT DO NOTHING on (trek_id, recorded_at) PK.
   * This means replaying an offline buffer never creates duplicate rows.
   *
   * Also runs:
   *   - Off-route detection (PostGIS ST_Distance)
   *   - Altitude threshold alerts
   *   - Anomaly detection side-effects (actual ML call handled by the Python service)
   */
  async ingestBatch(userId: string, pings: PingDto[]): Promise<{
    accepted: number;
    offRoute: boolean;
    altitudeAlert: string | null;
  }> {
    if (pings.length === 0) return { accepted: 0, offRoute: false, altitudeAlert: null };
    if (pings.length > 100) {
      throw new ForbiddenException('Batch size exceeds maximum of 100 pings');
    }

    // Verify all pings in the batch belong to active treks owned by this user.
    const trekIds = [...new Set(pings.map((p) => p.trekId))];
    const { rows: treks } = await this.db.query(
      `SELECT id FROM treks WHERE id = ANY($1) AND user_id = $2 AND status = 'ACTIVE'`,
      [trekIds, userId],
    );
    const validTrekIds = new Set(treks.map((t: { id: string }) => t.id));

    let accepted = 0;
    let offRoute = false;
    let altitudeAlert: string | null = null;
    let previousAlt: number | undefined;

    for (const ping of pings) {
      if (!validTrekIds.has(ping.trekId)) continue;

      // INSERT ... ON CONFLICT DO NOTHING — idempotent replay of offline buffers.
      await this.db.query(
        `INSERT INTO trek_pings (
           recorded_at, trek_id, user_id, location,
           altitude_meters, accuracy_meters, heading_degrees,
           speed_mps, battery_percent, network_type, is_offline_buffered
         ) VALUES (
           $1, $2, $3,
           ST_GeogFromText('POINT(' || $5 || ' ' || $4 || ')'),
           $6, $7, $8, $9, $10, $11::network_type, $12
         ) ON CONFLICT (trek_id, recorded_at) DO NOTHING`,
        [
          ping.recordedAt,
          ping.trekId,
          userId,
          ping.lat,
          ping.lng,
          ping.altitudeMeters ?? null,
          ping.accuracyMeters ?? null,
          ping.headingDegrees ?? null,
          ping.speedMps ?? null,
          ping.batteryPercent ?? null,
          ping.networkType ?? null,
          ping.isOfflineBuffered,
        ],
      );
      accepted++;

      // Check off-route for the latest ping (most recent by recordedAt).
      if (!offRoute && ping.altitudeMeters !== undefined) {
        offRoute = await this.treksService.checkOffRoute(ping.trekId, ping.lat, ping.lng);
      }

      // Altitude threshold alert: check if we crossed a threshold since last ping.
      if (ping.altitudeMeters !== undefined) {
        const alert = this.treksService.getAltitudeAlert(
          ping.altitudeMeters,
          previousAlt ?? ping.altitudeMeters,
        );
        if (alert) altitudeAlert = alert;
        previousAlt = ping.altitudeMeters;
      }
    }

    return { accepted, offRoute, altitudeAlert };
  }

  /**
   * Fetch the last N pings for a trek (for the live-track web view).
   * Ordered newest-first so the map can render the recent trail.
   */
  async getRecentPings(trekId: string, limit = 100) {
    const { rows } = await this.db.query(
      `SELECT
         recorded_at,
         ST_Y(location::geometry) AS lat,
         ST_X(location::geometry) AS lng,
         altitude_meters,
         accuracy_meters,
         battery_percent,
         network_type,
         is_offline_buffered
       FROM trek_pings
       WHERE trek_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [trekId, limit],
    );
    return rows;
  }
}
