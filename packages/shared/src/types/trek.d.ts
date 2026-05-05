export declare enum TrekStatus {
    PLANNED = "PLANNED",
    ACTIVE = "ACTIVE",
    COMPLETED = "COMPLETED",
    OVERDUE = "OVERDUE",
    INCIDENT = "INCIDENT",
    CANCELLED = "CANCELLED"
}
export declare enum SosMode {
    HELP = "HELP",
    MEDICAL = "MEDICAL",
    CRITICAL = "CRITICAL"
}
export declare enum EscalationLevel {
    L0 = "L0",
    L1 = "L1",
    L2 = "L2",
    L3 = "L3",
    L4 = "L4",
    L5 = "L5"
}
export interface GpsCoordinate {
    lat: number;
    lng: number;
    altitudeMeters?: number;
    accuracyMeters?: number;
    headingDegrees?: number;
    speedMps?: number;
    recordedAt: string;
}
export interface TrekPing extends GpsCoordinate {
    trekId: string;
    userId: string;
    batteryPercent?: number;
    networkType?: 'WIFI' | '4G' | '3G' | '2G' | 'OFFLINE';
    isOfflineBuffered: boolean;
}
export interface EmergencyContact {
    id: string;
    userId: string;
    name: string;
    phone: string;
    relation: string;
    notifyBySms: boolean;
    notifyByWhatsapp: boolean;
    notifyByPush: boolean;
    isConfirmed: boolean;
}
//# sourceMappingURL=trek.d.ts.map