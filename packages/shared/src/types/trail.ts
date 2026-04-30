/**
 * Difficulty scale follows the Indian trekking convention (not US/EU systems).
 * Easy = day hikes, no altitude. Hard = 4000m+, technical sections.
 */
export enum TrailDifficulty {
  EASY = 'EASY',
  MODERATE = 'MODERATE',
  HARD = 'HARD',
  EXTREME = 'EXTREME',
}

export enum TrailRegion {
  GARHWAL = 'GARHWAL',
  KUMAON = 'KUMAON',
  HIMACHAL = 'HIMACHAL',
  KASHMIR = 'KASHMIR',
  SIKKIM = 'SIKKIM',
  NORTHEAST = 'NORTHEAST',
  WESTERN_GHATS_NORTH = 'WESTERN_GHATS_NORTH', // Maharashtra / Karnataka Sahyadri
  WESTERN_GHATS_SOUTH = 'WESTERN_GHATS_SOUTH', // Kerala / Tamil Nadu
  ARAVALLIS = 'ARAVALLIS',
  EASTERN_GHATS = 'EASTERN_GHATS',
  OTHER = 'OTHER',
}

export interface Trail {
  id: string;
  slug: string; // URL-safe, e.g. "kedarkantha-winter-trek"
  name: string;
  region: TrailRegion;
  difficulty: TrailDifficulty;
  maxAltitudeMeters: number;
  distanceKm: number;
  typicalDurationDays: number;
  startLatLng: [number, number]; // [lat, lng]
  endLatLng: [number, number];
  // geometry stored as PostGIS LineString in DB; this type is for API responses
  gpxUrl?: string;
  requiresIlp: boolean; // Inner Line Permit required
  requiresForestPermit: boolean;
  requiresImfPermit: boolean; // IMF expedition permit
  bestMonths: number[]; // 1-12
  createdAt: string;
  updatedAt: string;
}

export interface Waypoint {
  id: string;
  trailId: string;
  name: string;
  type: WaypointType;
  lat: number;
  lng: number;
  altitudeMeters?: number;
  description?: string;
  networkOperator?: string; // e.g. "Jio", "Airtel" — for signal spot waypoints
}

export type WaypointType =
  | 'CAMPSITE'
  | 'WATER_SOURCE'
  | 'HELIPAD'
  | 'NETWORK_SPOT'
  | 'DHABA'
  | 'ARMY_POST'
  | 'MEDICAL'
  | 'PERMIT_CHECK'
  | 'VIEWPOINT';
