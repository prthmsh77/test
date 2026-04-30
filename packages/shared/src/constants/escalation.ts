/**
 * Grace periods before each escalation level fires (in milliseconds).
 * These match PRD §7.5 exactly. Changing them requires a PRD amendment.
 *
 * L0 fires AT planned_end (0 offset)
 * L1 fires 30 min after planned_end
 * L2 fires 2 hours after planned_end
 * L3 fires 4 hours after planned_end
 * L4 fires 6 hours after planned_end
 */
export const ESCALATION_OFFSETS_MS = {
  L0: 0,
  L1: 30 * 60 * 1000,
  L2: 2 * 60 * 60 * 1000,
  L3: 4 * 60 * 60 * 1000,
  L4: 6 * 60 * 60 * 1000,
} as const;

/**
 * Altitude thresholds for AMS notifications (metres).
 * Based on standard wilderness medicine guidelines cited in PRD §6.2.
 */
export const AMS_ALTITUDE_THRESHOLDS_M = [2400, 3500, 4500] as const;

/**
 * Off-route deviation that triggers an "Are you OK?" prompt.
 * 150m is the PRD-specified threshold (§7.3).
 */
export const OFF_ROUTE_DEVIATION_METERS = 150;

/**
 * How long the user must stay off-route before the prompt escalates silently.
 */
export const OFF_ROUTE_ESCALATION_WAIT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Sentinel dispatch radius — volunteers within this radius are notified at L3.
 */
export const SENTINEL_DISPATCH_RADIUS_KM = 5;

/**
 * Battery threshold below which ping interval switches to low-power mode.
 */
export const LOW_BATTERY_THRESHOLD_PERCENT = 20;
