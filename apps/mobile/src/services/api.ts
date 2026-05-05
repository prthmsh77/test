/**
 * API Client for Shikhar Backend.
 * Set EXPO_PUBLIC_API_BASE_URL in .env for production.
 * Defaults to the standard local dev machine address.
 */

const API_BASE_URL =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_API_BASE_URL) ||
  "http://localhost:3000";

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data?: T; error?: string }> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
      };

      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const text = await response.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return { error: text || "Unknown error" };
      }

      if (!response.ok) {
        return { error: data.message || `HTTP ${response.status}` };
      }

      return { data };
    } catch (error: any) {
      return { error: error.message || "Network error" };
    }
  }

  // ─── Auth ───────────────────────────────────────────
  async requestOtp(phone: string) {
    return this.request("/api/v1/auth/otp/request", {
      method: "POST",
      body: JSON.stringify({ phone }),
    });
  }

  async verifyOtp(phone: string, otp: string) {
    return this.request<{ accessToken: string; refreshToken: string }>(
      "/api/v1/auth/otp/verify",
      {
        method: "POST",
        body: JSON.stringify({ phone, otp }),
      }
    );
  }

  // ─── User ──────────────────────────────────────────
  async getMe() {
    return this.request<{ id: string; phone: string; display_name: string }>(
      "/api/v1/users/me"
    );
  }

  // ─── Emergency Contacts ────────────────────────────
  async getEmergencyContacts() {
    return this.request<any[]>("/api/v1/users/me/emergency-contacts");
  }

  async addEmergencyContact(data: { name: string; phone: string; relation: string }) {
    return this.request("/api/v1/users/me/emergency-contacts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteEmergencyContact(id: string) {
    return this.request(`/api/v1/users/me/emergency-contacts/${id}`, {
      method: "DELETE",
    });
  }

  // ─── Treks ─────────────────────────────────────────
  async createTrek(data: {
    trailId?: string;
    plannedStartAt: string;
    plannedEndAt: string;
    contactIds: string[];
    erss112Consent: boolean;
    groupSize?: number;
  }) {
    return this.request<{ id: string }>(
      "/api/v1/treks",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    );
  }

  async startTrek(trekId: string) {
    return this.request<{
      id: string;
      live_track_token: string;
      live_track_url: string;
    }>(`/api/v1/treks/${trekId}/start`, {
      method: "POST",
    });
  }

  async endTrek(trekId: string, pin: string) {
    return this.request(`/api/v1/treks/${trekId}/end`, {
      method: "POST",
      // trekId must be in body due to EndTrekDto validation
      body: JSON.stringify({ trekId, pin }),
    });
  }

  async listUserTreks(status?: string) {
    const qs = status ? `?status=${status}` : "";
    return this.request<any[]>(`/api/v1/treks${qs}`);
  }

  // ─── Pings ─────────────────────────────────────────
  async sendPingBatch(
    pings: Array<{
      trek_id: string;
      latitude: number;
      longitude: number;
      altitude: number;
      accuracy: number;
      recorded_at: string;
      battery_percent?: number;
    }>
  ) {
    return this.request("/api/v1/pings/batch", {
      method: "POST",
      body: JSON.stringify({ pings }),
    });
  }

  // ─── SOS ───────────────────────────────────────────
  async triggerSOS(trekId: string, mode: "HELP" | "MEDICAL" | "CRITICAL") {
    return this.request(`/api/v1/treks/${trekId}/sos`, {
      method: "POST",
      // Backend SosDto expects `trekId` + `mode` (SosMode enum)
      body: JSON.stringify({ trekId, mode }),
    });
  }

  // ─── Trails ────────────────────────────────────────
  async getTrails() {
    return this.request<any[]>("/api/v1/trails");
  }
}

export const api = new ApiClient();
