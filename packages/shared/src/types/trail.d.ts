export declare enum TrailDifficulty {
    EASY = "EASY",
    MODERATE = "MODERATE",
    HARD = "HARD",
    EXTREME = "EXTREME"
}
export declare enum TrailRegion {
    GARHWAL = "GARHWAL",
    KUMAON = "KUMAON",
    HIMACHAL = "HIMACHAL",
    KASHMIR = "KASHMIR",
    SIKKIM = "SIKKIM",
    NORTHEAST = "NORTHEAST",
    WESTERN_GHATS_NORTH = "WESTERN_GHATS_NORTH",
    WESTERN_GHATS_SOUTH = "WESTERN_GHATS_SOUTH",
    ARAVALLIS = "ARAVALLIS",
    EASTERN_GHATS = "EASTERN_GHATS",
    OTHER = "OTHER"
}
export interface Trail {
    id: string;
    slug: string;
    name: string;
    region: TrailRegion;
    difficulty: TrailDifficulty;
    maxAltitudeMeters: number;
    distanceKm: number;
    typicalDurationDays: number;
    startLatLng: [number, number];
    endLatLng: [number, number];
    gpxUrl?: string;
    requiresIlp: boolean;
    requiresForestPermit: boolean;
    requiresImfPermit: boolean;
    bestMonths: number[];
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
    networkOperator?: string;
}
export type WaypointType = 'CAMPSITE' | 'WATER_SOURCE' | 'HELIPAD' | 'NETWORK_SPOT' | 'DHABA' | 'ARMY_POST' | 'MEDICAL' | 'PERMIT_CHECK' | 'VIEWPOINT';
//# sourceMappingURL=trail.d.ts.map