import {
  Injectable, Inject, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { Connection, Client } from '@temporalio/client';
import { createHash, randomBytes } from 'crypto';
import { sign as jwtSign } from 'jsonwebtoken';
import { DB_POOL } from '../../database/database.module';
import { TrekStatus, SosMode, ESCALATION_OFFSETS_MS, AMS_ALTITUDE_THRESHOLDS_M, OFF_ROUTE_DEVIATION_METERS } from '@shikhar/shared';
import { CreateTrekDto, SosDto } from './dto/treks.dto';
import { escalationWorkflow, trekEndedSignal, extendTimeSignal, sosTriggerSignal } from './workflows/escalation.workflow';
import type { EscalationContext } from './activities/escalation.activities';

@Injectable()
export class TreksService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  // ── 3.1 / 3.2: Create trek + validate state ──────────────────────────────

  async createTrek(userId: string, dto: CreateTrekDto) {
    const plannedStart = new Date(dto.plannedStartAt);
    const plannedEnd = new Date(dto.plannedEndAt);

    if (plannedEnd <= plannedStart) {
      throw new BadRequestException('planned_end_at must be after planned_start_at');
    }
    if (plannedStart < new Date()) {
      throw new BadRequestException('planned_start_at must be in the future');
    }

    // Validate that all contact IDs belong to this user.
    if (dto.contactIds.length === 0) {
      throw new BadRequestException('At least one emergency contact is required');
    }
    const { rows: contacts } = await this.db.query(
      `SELECT id FROM emergency_contacts WHERE user_id = $1 AND id = ANY($2) AND is_confirmed = true`,
      [userId, dto.contactIds],
    );
    if (contacts.length === 0) {
      throw new BadRequestException(
        'No confirmed emergency contacts found. Contacts must confirm via SMS before use.',
      );
    }

    // Build the route geography from GeoJSON if provided.
    let routeGeography: string | null = null;
    if (dto.routeGeoJson) {
      routeGeography = `ST_GeogFromGeoJSON('${JSON.stringify(dto.routeGeoJson)}')`;
    }

    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO treks (
         user_id, trail_id, planned_start_at, planned_end_at,
         ${routeGeography ? 'declared_route,' : ''}
         max_altitude_meters, group_size, erss_112_consent, status
       ) VALUES (
         $1, $2, $3, $4,
         ${routeGeography ? `${routeGeography},` : ''}
         $5, $6, $7, 'PLANNED'
       ) RETURNING id`,
      [
        userId,
        dto.trailId ?? null,
        plannedStart.toISOString(),
        plannedEnd.toISOString(),
        dto.maxAltitudeMeters ?? null,
        dto.groupSize ?? 1,
        dto.erss112Consent,
      ],
    );

    const trekId = rows[0].id;

    // Link selected emergency contacts to this trek.
    for (const contactId of dto.contactIds) {
      await this.db.query(
        `INSERT INTO trek_emergency_contacts (trek_id, contact_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [trekId, contactId],
      );
    }

    return this.findById(trekId, userId);
  }

  // ── 3.3: Trek Start — generate live-track URL + notify E-Contacts ────────

  async startTrek(userId: string, trekId: string) {
    const trek = await this.findById(trekId, userId);

    if (trek.status !== TrekStatus.PLANNED) {
      throw new ConflictException(`Trek is already ${trek.status}`);
    }

    // Generate a signed live-track JWT token (short slug as jti for URL).
    const token = randomBytes(6).toString('hex'); // 12-char hex slug
    const jwt = jwtSign(
      { trekId, userId, token },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn: '8d', issuer: 'shikhar.app' },
    );
    const liveTrackUrl = `${process.env.LIVE_TRACK_BASE_URL || 'http://localhost:3001/t'}/${token}`;
    const liveTrackExpiry = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

    await this.db.query(
      `UPDATE treks SET
         status = 'ACTIVE',
         actual_start_at = NOW(),
         live_track_token = $1,
         live_track_expires_at = $2
       WHERE id = $3`,
      [token, liveTrackExpiry.toISOString(), trekId],
    );

    // Fetch E-Contacts for SMS notification.
    const { rows: contacts } = await this.db.query(
      `SELECT ec.name, ec.phone, ec.notify_by_sms, ec.notify_by_whatsapp
       FROM trek_emergency_contacts tec
       JOIN emergency_contacts ec ON ec.id = tec.contact_id
       WHERE tec.trek_id = $1`,
      [trekId],
    );

    // Fetch user info for the notification message.
    const { rows: userRows } = await this.db.query<{ name: string }>(
      `SELECT name FROM users WHERE id = $1`,
      [userId],
    );
    const userName = userRows[0]?.name ?? 'Your trekker';

    // Fetch trail name if linked.
    const { rows: trailRows } = await this.db.query<{ name: string }>(
      `SELECT t2.name FROM treks t JOIN trails t2 ON t2.id = t.trail_id WHERE t.id = $1`,
      [trekId],
    );
    const trailName = trailRows[0]?.name ?? 'a trek';

    // Fire-and-forget SMS to all E-Contacts (actual delivery handled by notification service in Phase 7).
    const plannedEnd = new Date(trek.planned_end_at);
    const smsBody =
      `${userName} has started ${trailName}. ` +
      `Expected return: ${plannedEnd.toUTCString()}. ` +
      `Track live: ${liveTrackUrl} (no app needed)`;

    for (const contact of contacts) {
      if (contact.notify_by_sms) {
        // In dev: logged. In production: MSG91 DLT-registered template.
        console.log(`[SMS] To: ${contact.phone} | ${smsBody}`);
      }
    }

    // Start Temporal escalation workflow.
    await this.startEscalationWorkflow(trekId, {
      trekId,
      userId,
      userName,
      trailName,
      liveTrackUrl,
      emergencyContacts: contacts.map((c) => ({
        id: c.id ?? '',
        name: c.name,
        phone: c.phone,
        notifyBySms: c.notify_by_sms,
        notifyByWhatsapp: c.notify_by_whatsapp,
      })),
      erss112Consent: trek.erss_112_consent,
      plannedEndAt: trek.planned_end_at,
    });

    return { liveTrackUrl, liveTrackToken: token, trekId };
  }

  // ── 3.5: Trek End / Check-out with 2FA PIN ────────────────────────────────

  async endTrek(userId: string, trekId: string, pin: string) {
    const trek = await this.findById(trekId, userId);

    if (!['ACTIVE', 'OVERDUE'].includes(trek.status)) {
      throw new ConflictException(`Cannot end a trek in ${trek.status} state`);
    }

    // Retrieve the user's stored PIN hash for 2FA verification.
    // PRD §7.4: two-factor confirmation prevents accidental check-out.
    const { rows: pinRows } = await this.db.query<{ trek_pin_hash: string; duress_pin_hash: string }>(
      `SELECT trek_pin_hash, duress_pin_hash FROM users WHERE id = $1`,
      [userId],
    );

    // In dev without a stored PIN, skip 2FA (onboarding flow sets PIN later).
    const pinHash = pinRows[0]?.trek_pin_hash;
    const duressPinHash = pinRows[0]?.duress_pin_hash;
    const inputHash = createHash('sha256').update(pin).digest('hex');

    let isDuress = false;
    if (pinHash && inputHash !== pinHash) {
      if (duressPinHash && inputHash === duressPinHash) {
        // Coercion/duress mode: appears to end normally but escalates to L4 silently.
        isDuress = true;
      } else {
        throw new ForbiddenException('Incorrect PIN');
      }
    }

    if (isDuress) {
      // Mark as duress — do NOT actually end the trek, silently fire L4.
      await this.db.query(
        `UPDATE treks SET is_duress = true, escalation_level = 'L4' WHERE id = $1`,
        [trekId],
      );
      await this.signalWorkflow(trekId, sosTriggerSignal.name, { mode: 'CRITICAL' });
      // Return a "success" response so the coercer believes the check-out succeeded.
      return { message: 'Trek ended successfully' };
    }

    // Normal check-out.
    await this.db.query(
      `UPDATE treks SET status = 'COMPLETED', actual_end_at = NOW() WHERE id = $1`,
      [trekId],
    );

    // Signal the Temporal workflow to cancel all pending escalation timers.
    await this.signalWorkflow(trekId, trekEndedSignal.name, {});

    return { message: 'Trek completed successfully. Stay safe!' };
  }

  // ── Extend planned end time ───────────────────────────────────────────────

  async extendTrek(userId: string, trekId: string, newPlannedEndAt: string) {
    const trek = await this.findById(trekId, userId);
    if (trek.status !== TrekStatus.ACTIVE) {
      throw new ConflictException('Only active treks can be extended');
    }
    const newEnd = new Date(newPlannedEndAt);
    if (newEnd <= new Date()) {
      throw new BadRequestException('New end time must be in the future');
    }

    await this.db.query(
      `UPDATE treks SET planned_end_at = $1 WHERE id = $2`,
      [newEnd.toISOString(), trekId],
    );

    // Signal Temporal workflow to reset its timer.
    await this.signalWorkflow(trekId, extendTimeSignal.name, { newPlannedEndAt });

    return { message: 'Trek end time extended', newPlannedEndAt };
  }

  // ── 3.9: SOS endpoint (3 modes: HELP, MEDICAL, CRITICAL) ─────────────────

  async triggerSos(userId: string, dto: SosDto) {
    const trek = await this.findById(dto.trekId, userId);
    if (trek.status !== TrekStatus.ACTIVE) {
      throw new ConflictException('SOS can only be triggered on an active trek');
    }

    // Log to escalation_events (append-only audit trail).
    await this.db.query(
      `INSERT INTO escalation_events (trek_id, level, trigger_reason, actions_taken)
       VALUES ($1, $2, $3, $4)`,
      [
        dto.trekId,
        dto.mode === SosMode.CRITICAL ? 'L4' : dto.mode === SosMode.MEDICAL ? 'L3' : 'L1',
        `User-triggered SOS: mode=${dto.mode}`,
        JSON.stringify([{ action: 'sos_button_pressed', mode: dto.mode, at: new Date().toISOString() }]),
      ],
    );

    if (dto.mode === SosMode.CRITICAL) {
      // Jump straight to L4 escalation via workflow signal.
      await this.signalWorkflow(dto.trekId, sosTriggerSignal.name, { mode: dto.mode });
      await this.db.query(
        `UPDATE treks SET escalation_level = 'L4', status = 'INCIDENT' WHERE id = $1`,
        [dto.trekId],
      );
    } else if (dto.mode === SosMode.MEDICAL) {
      await this.signalWorkflow(dto.trekId, sosTriggerSignal.name, { mode: dto.mode });
      await this.db.query(
        `UPDATE treks SET escalation_level = 'L3' WHERE id = $1`,
        [dto.trekId],
      );
    }
    // HELP mode: notifies E-Contacts only, handled by L1 activity.

    return {
      message: `SOS (${dto.mode}) acknowledged. Emergency contacts and${dto.mode === SosMode.CRITICAL ? ' authorities are' : ''} being alerted.`,
    };
  }

  // ── 3.7: Off-route detection (PostGIS) ───────────────────────────────────

  async checkOffRoute(trekId: string, lat: number, lng: number): Promise<boolean> {
    const { rows } = await this.db.query<{ distance_m: number }>(
      `SELECT ST_Distance(
         declared_route,
         ST_GeogFromText('POINT(' || $2 || ' ' || $1 || ')')
       ) AS distance_m
       FROM treks WHERE id = $3 AND declared_route IS NOT NULL`,
      [lat, lng, trekId],
    );

    if (rows.length === 0) return false; // No declared route — cannot detect deviation
    return rows[0].distance_m > OFF_ROUTE_DEVIATION_METERS;
  }

  // ── 3.8: Altitude threshold checks ───────────────────────────────────────

  getAltitudeAlert(currentAltM: number, previousAltM: number): string | null {
    for (const threshold of AMS_ALTITUDE_THRESHOLDS_M) {
      if (previousAltM < threshold && currentAltM >= threshold) {
        return `You've crossed ${threshold}m. Review the AMS symptom checklist and monitor yourself closely.`;
      }
    }
    return null;
  }

  // ── Generic helpers ───────────────────────────────────────────────────────

  async findById(trekId: string, userId: string) {
    const { rows } = await this.db.query(
      `SELECT t.*, u.name as user_name
       FROM treks t JOIN users u ON u.id = t.user_id
       WHERE t.id = $1 AND t.user_id = $2`,
      [trekId, userId],
    );
    if (!rows[0]) throw new NotFoundException(`Trek ${trekId} not found`);
    return rows[0];
  }

  async listUserTreks(userId: string, status?: string) {
    let query = `SELECT id, trail_id, status, planned_start_at, planned_end_at,
                        actual_start_at, actual_end_at, live_track_token, escalation_level
                 FROM treks WHERE user_id = $1`;
    const params: unknown[] = [userId];
    if (status) {
      query += ` AND status = $2::trek_status`;
      params.push(status);
    }
    query += ' ORDER BY planned_start_at DESC';
    const { rows } = await this.db.query(query, params);
    return rows;
  }

  // ── Temporal workflow helpers ─────────────────────────────────────────────

  private async getTemporalClient(): Promise<Client | null> {
    if (!process.env.TEMPORAL_ADDRESS) {
      console.log('[Temporal] TEMPORAL_ADDRESS not set — workflow signals are no-ops in dev');
      return null;
    }
    try {
      const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS });
      return new Client({ connection });
    } catch {
      console.warn('[Temporal] Could not connect — escalation workflow disabled');
      return null;
    }
  }

  private async startEscalationWorkflow(
    trekId: string,
    ctx: EscalationContext,
  ): Promise<void> {
    const client = await this.getTemporalClient();
    if (!client) return;

    try {
      await client.workflow.start(escalationWorkflow, {
        args: [ctx],
        taskQueue: 'shikhar-escalation',
        // Trek ID is the workflow ID — guarantees idempotency (no duplicate workflows).
        workflowId: `escalation-${trekId}`,
      });

      // Persist the workflow ID so we can signal it later.
      await this.db.query(
        `UPDATE treks SET temporal_workflow_id = $1 WHERE id = $2`,
        [`escalation-${trekId}`, trekId],
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Temporal] Failed to start workflow for trek ${trekId}: ${message}`);
    }
  }

  private async signalWorkflow(trekId: string, signalName: string, payload: object): Promise<void> {
    const client = await this.getTemporalClient();
    if (!client) return;

    const { rows } = await this.db.query<{ temporal_workflow_id: string }>(
      `SELECT temporal_workflow_id FROM treks WHERE id = $1`,
      [trekId],
    );
    if (!rows[0]?.temporal_workflow_id) return;

    try {
      const handle = client.workflow.getHandle(rows[0].temporal_workflow_id);
      await handle.signal(signalName, payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[Temporal] Signal ${signalName} failed for trek ${trekId}: ${message}`);
    }
  }
}
