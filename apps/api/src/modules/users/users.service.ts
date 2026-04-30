import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';

@Injectable()
export class UsersService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findById(id: string) {
    const { rows } = await this.db.query(
      `SELECT id, phone, name, avatar_url, bio, role, is_verified,
              preferred_language, pro_subscription, pro_expires_at, created_at
       FROM users WHERE id = $1 AND is_active = true`,
      [id],
    );
    if (!rows[0]) throw new NotFoundException('User not found');
    return rows[0];
  }

  async updateProfile(id: string, updates: { name?: string; bio?: string; preferredLanguage?: string }) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIdx++}`);
      values.push(updates.name);
    }
    if (updates.bio !== undefined) {
      fields.push(`bio = $${paramIdx++}`);
      values.push(updates.bio);
    }
    if (updates.preferredLanguage !== undefined) {
      fields.push(`preferred_language = $${paramIdx++}`);
      values.push(updates.preferredLanguage);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    const { rows } = await this.db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIdx} RETURNING *`,
      values,
    );
    return rows[0];
  }

  /**
   * Emergency contacts management.
   * Free tier: max 5 contacts. Pro tier: max 10. (PRD §9.1 Shikhar Pro)
   */
  async getEmergencyContacts(userId: string) {
    const { rows } = await this.db.query(
      `SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY created_at`,
      [userId],
    );
    return rows;
  }

  async addEmergencyContact(
    userId: string,
    isPro: boolean,
    contact: { name: string; phone: string; relation: string; notifyBySms?: boolean; notifyByWhatsapp?: boolean },
  ) {
    const { rows: existing } = await this.db.query(
      `SELECT COUNT(*) as count FROM emergency_contacts WHERE user_id = $1`,
      [userId],
    );
    const currentCount = parseInt(existing[0].count, 10);
    const maxContacts = isPro ? 10 : 5;

    if (currentCount >= maxContacts) {
      throw new BadRequestException(
        `Maximum ${maxContacts} emergency contacts allowed${isPro ? '' : ' on the free tier (Pro allows 10)'}`,
      );
    }

    const token = Math.random().toString(36).substring(2, 18);

    const { rows } = await this.db.query(
      `INSERT INTO emergency_contacts
         (user_id, name, phone, relation, notify_by_sms, notify_by_whatsapp, confirmation_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        contact.name,
        contact.phone,
        contact.relation,
        contact.notifyBySms ?? true,
        contact.notifyByWhatsapp ?? false,
        token,
      ],
    );

    // TODO Phase 7: send confirmation SMS to contact with the token.
    return rows[0];
  }

  async removeEmergencyContact(userId: string, contactId: string) {
    const { rowCount } = await this.db.query(
      `DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2`,
      [contactId, userId],
    );
    if (rowCount === 0) throw new NotFoundException('Contact not found');
  }
}
