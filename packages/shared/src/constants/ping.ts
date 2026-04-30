/**
 * GPS ping intervals in milliseconds, keyed by connectivity and battery state.
 * PRD §7.2 and §8.1 specify these values.
 * Adaptive selection logic lives in the mobile background-geolocation service.
 */
export const PING_INTERVALS_MS = {
  CELLULAR_NORMAL: 15 * 1000, // 15 seconds on 3G/4G/5G
  CELLULAR_2G: 60 * 1000, // 1 minute on 2G/EDGE
  LOW_POWER: 5 * 60 * 1000, // 5 minutes below 20% battery
  VERY_LOW_POWER: 30 * 60 * 1000, // 30 minutes — extreme conservation
  OFFLINE: 0, // device caches locally; no actual ping
} as const;

/**
 * Maximum number of pings the device stores offline before oldest are dropped.
 * 100 pings @ 15s cadence ≈ 25 minutes of data — enough for most coverage gaps.
 */
export const MAX_OFFLINE_PING_CACHE = 100;
