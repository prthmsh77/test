/**
 * WebSocket client for Shikhar live-track.
 * Connects to the NestJS /live-track namespace using the trekker's JWT.
 * E-Contacts and the web live-track page connect with the live-track JWT.
 *
 * Usage:
 *   liveTrackSocket.connect(authToken);
 *   liveTrackSocket.joinTrek(trekId);
 *   liveTrackSocket.on('ping', handler);
 *   liveTrackSocket.disconnect();
 */
import { io, Socket } from "socket.io-client";

const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  "http://localhost:3000";

type PingEvent = {
  lat: number;
  lng: number;
  altitudeMeters?: number;
  recordedAt: string;
  offRoute: boolean;
  altitudeAlert: string | null;
};

type OffRouteEvent = { trekId: string };
type AltitudeAlertEvent = { trekId: string; alert: string };

class LiveTrackSocketService {
  private socket: Socket | null = null;
  private trekId: string | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(`${API_BASE_URL}/live-track`, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    this.socket.on("connect", () => {
      console.log("[WS] Connected to live-track namespace");
      if (this.trekId) {
        this.socket?.emit("join-trek", this.trekId);
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("[WS] Disconnected:", reason);
    });

    this.socket.on("connect_error", (err) => {
      console.warn("[WS] Connection error:", err.message);
    });
  }

  joinTrek(trekId: string) {
    this.trekId = trekId;
    if (this.socket?.connected) {
      this.socket.emit("join-trek", trekId);
    }
  }

  on(event: "ping", handler: (data: PingEvent) => void): void;
  on(event: "off-route", handler: (data: OffRouteEvent) => void): void;
  on(event: "altitude-alert", handler: (data: AltitudeAlertEvent) => void): void;
  on(event: string, handler: (data: any) => void) {
    this.socket?.on(event, handler);
  }

  off(event: string, handler?: (data: any) => void) {
    this.socket?.off(event, handler);
  }

  disconnect() {
    this.trekId = null;
    this.socket?.disconnect();
    this.socket = null;
  }

  get isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const liveTrackSocket = new LiveTrackSocketService();
