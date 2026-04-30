/**
 * Trek state machine states.
 * A trek progresses linearly except INCIDENT can be reached from any ACTIVE state.
 * OVERDUE is a transient state — it becomes INCIDENT after L4 auto-escalation fires.
 */
export enum TrekStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  INCIDENT = 'INCIDENT',
  CANCELLED = 'CANCELLED',
}

/**
 * SOS severity modes — directly maps to the escalation path taken.
 * HELP: family-only alert (no authority dispatch)
 * MEDICAL: E-Contacts + Sentinels + recommended 112 call
 * CRITICAL: immediate L4 — auto-dispatch to ERSS-112 if user consented
 */
export enum SosMode {
  HELP = 'HELP',
  MEDICAL = 'MEDICAL',
  CRITICAL = 'CRITICAL',
}

/**
 * Escalation ladder levels as defined in PRD §7.5.
 * L0 = soft push to user
 * L4 = ERSS-112 authority dispatch
 */
export enum EscalationLevel {
  L0 = 'L0',
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
}

export interface GpsCoordinate {
  lat: number;
  lng: number;
  altitudeMeters?: number;
  accuracyMeters?: number;
  headingDegrees?: number;
  speedMps?: number;
  recordedAt: string; // ISO-8601
}

export interface TrekPing extends GpsCoordinate {
  trekId: string;
  userId: string;
  batteryPercent?: number;
  networkType?: 'WIFI' | '4G' | '3G' | '2G' | 'OFFLINE';
  isOfflineBuffered: boolean; // true when this ping was cached offline then synced
}

export interface EmergencyContact {
  id: string;
  userId: string;
  name: string;
  phone: string; // E.164 format, e.g. +919876543210
  relation: string;
  notifyBySms: boolean;
  notifyByWhatsapp: boolean;
  notifyByPush: boolean;
  isConfirmed: boolean; // contact must reply to confirmation SMS before being active
}
