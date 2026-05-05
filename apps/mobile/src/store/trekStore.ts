import { create } from 'zustand';
import { liveTrackSocket } from '../services/socket.service';

export type TrekState = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'OVERDUE' | 'INCIDENT' | 'CANCELLED';
export type SOSType = 'HELP' | 'MEDICAL' | 'CRITICAL';

export interface Trail {
  id: string;
  name: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'extreme';
  distanceKm: number;
  peakAltitudeM: number;
  region: string;
  coordinates: { latitude: number; longitude: number };
}

export interface Trek {
  id: string;
  trailId: string;
  trailName: string;
  state: TrekState;
  startDate: string;
  endDate: string;
  emergencyContacts: string[];
  liveTrackToken?: string;
}

export interface LocationPing {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  timestamp: number;
  battery?: number;
}

interface TrekStoreState {
  trails: Trail[];
  activeTrek: Trek | null;
  currentLocation: LocationPing | null;
  locationHistory: LocationPing[];
  isTracking: boolean;
  wsConnected: boolean;

  setTrails: (trails: Trail[]) => void;
  startTrek: (trek: Trek) => void;
  endTrek: () => void;
  updateLocation: (location: LocationPing) => void;
  setTracking: (tracking: boolean) => void;
  setWsConnected: (connected: boolean) => void;
}

const SEED_TRAILS: Trail[] = [
  {
    id: '1',
    name: 'Triund Trek',
    difficulty: 'easy',
    distanceKm: 9,
    peakAltitudeM: 2850,
    region: 'Himachal Pradesh',
    coordinates: { latitude: 32.2396, longitude: 76.3212 },
  },
  {
    id: '2',
    name: 'Kedarkantha Trek',
    difficulty: 'moderate',
    distanceKm: 20,
    peakAltitudeM: 3810,
    region: 'Uttarakhand',
    coordinates: { latitude: 31.0672, longitude: 78.1694 },
  },
  {
    id: '3',
    name: 'Hampta Pass',
    difficulty: 'moderate',
    distanceKm: 26,
    peakAltitudeM: 4270,
    region: 'Himachal Pradesh',
    coordinates: { latitude: 32.2930, longitude: 77.1912 },
  },
  {
    id: '4',
    name: 'Rajmachi Fort',
    difficulty: 'easy',
    distanceKm: 15,
    peakAltitudeM: 915,
    region: 'Maharashtra',
    coordinates: { latitude: 18.8346, longitude: 73.3971 },
  },
  {
    id: '5',
    name: 'Kalsubai Peak',
    difficulty: 'moderate',
    distanceKm: 10,
    peakAltitudeM: 1646,
    region: 'Maharashtra',
    coordinates: { latitude: 19.6014, longitude: 73.7112 },
  },
];

export const useTrekStore = create<TrekStoreState>((set) => ({
  trails: SEED_TRAILS,
  activeTrek: null,
  currentLocation: null,
  locationHistory: [],
  isTracking: false,
  wsConnected: false,

  setTrails: (trails) => set({ trails }),

  startTrek: (trek) => {
    set({
      activeTrek: { ...trek, state: 'ACTIVE' },
      locationHistory: [],
      isTracking: true,
    });

    // Connect to WebSocket and join the trek room for real-time alerts.
    if (trek.liveTrackToken) {
      liveTrackSocket.connect(trek.liveTrackToken);
      liveTrackSocket.joinTrek(trek.id);
      // Forward off-route and altitude alerts to console (UI can subscribe separately).
      liveTrackSocket.on('off-route', (data) => {
        console.warn('[WS] Off-route alert:', data);
      });
      liveTrackSocket.on('altitude-alert', (data) => {
        console.warn('[WS] Altitude alert:', data);
      });
    }
  },

  endTrek: () => {
    liveTrackSocket.disconnect();
    set({
      activeTrek: null,
      isTracking: false,
      locationHistory: [],
      wsConnected: false,
    });
  },

  updateLocation: (location) =>
    set((state) => ({
      currentLocation: location,
      locationHistory: [...state.locationHistory, location].slice(-500),
    })),

  setTracking: (tracking) => set({ isTracking: tracking }),

  setWsConnected: (connected) => set({ wsConnected: connected }),
}));
