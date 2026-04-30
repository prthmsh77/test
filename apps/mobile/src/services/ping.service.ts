/**
 * GPS ping service for React Native.
 * Full implementation: Phase 4.5 (react-native-background-geolocation).
 *
 * Key design decisions:
 * - Pings are queued in MMKV (on-device) before being sent to the server.
 *   This means pings survive app kills and network outages.
 * - Ping interval adapts to battery level and connectivity (PRD §8.1).
 * - The server endpoint is protobuf-friendly (compact payload) — Phase 4 will
 *   switch to protobuf encoding to hit the <200 byte target for 2G networks.
 */
import { PING_INTERVALS_MS, MAX_OFFLINE_PING_CACHE, LOW_BATTERY_THRESHOLD_PERCENT } from '@shikhar/shared';
import type { TrekPing } from '@shikhar/shared';

type NetworkType = 'WIFI' | '4G' | '3G' | '2G' | 'OFFLINE';

export function getPingIntervalMs(
  networkType: NetworkType,
  batteryPercent: number,
): number {
  if (batteryPercent < 10) return PING_INTERVALS_MS.VERY_LOW_POWER;
  if (batteryPercent < LOW_BATTERY_THRESHOLD_PERCENT) return PING_INTERVALS_MS.LOW_POWER;
  if (networkType === 'OFFLINE') return PING_INTERVALS_MS.OFFLINE;
  if (networkType === '2G') return PING_INTERVALS_MS.CELLULAR_2G;
  return PING_INTERVALS_MS.CELLULAR_NORMAL;
}

// Phase 4.5 will implement the actual background geolocation service using
// react-native-background-geolocation with the adaptive interval logic above.
export class PingService {
  private trekId: string;
  private offlineQueue: TrekPing[] = [];

  constructor(trekId: string) {
    this.trekId = trekId;
  }

  enqueuePing(ping: TrekPing): void {
    this.offlineQueue.push(ping);
    // Evict oldest pings beyond the cache limit to prevent unbounded growth.
    if (this.offlineQueue.length > MAX_OFFLINE_PING_CACHE) {
      this.offlineQueue.shift();
    }
  }

  async flushQueue(apiBaseUrl: string, authToken: string): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    const toSend = [...this.offlineQueue];
    this.offlineQueue = [];

    try {
      await fetch(`${apiBaseUrl}/api/v1/pings/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pings: toSend }),
      });
    } catch {
      // Re-enqueue on failure so pings aren't lost.
      this.offlineQueue = [...toSend, ...this.offlineQueue].slice(-MAX_OFFLINE_PING_CACHE);
    }
  }
}
