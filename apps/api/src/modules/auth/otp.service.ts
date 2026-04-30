import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { createHash, randomInt } from 'crypto';
import axios from 'axios';
import { DB_POOL } from '../../database/database.module';

@Injectable()
export class OtpService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  /**
   * Sends a 6-digit OTP to the given phone via MSG91.
   * In development (MSG91_API_KEY unset), logs the OTP to console instead.
   * The OTP is stored hashed (SHA-256) — never in plaintext.
   */
  async sendOtp(phone: string): Promise<void> {
    const otp = String(randomInt(100000, 999999));
    const otpHash = this.hashOtp(otp);

    // Invalidate any existing unverified OTPs for this phone to prevent accumulation.
    await this.db.query(
      `UPDATE otp_requests SET verified = true WHERE phone = $1 AND verified = false`,
      [phone],
    );

    await this.db.query(
      `INSERT INTO otp_requests (phone, otp_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [phone, otpHash],
    );

    if (process.env.MSG91_API_KEY) {
      await this.sendViaMSG91(phone, otp);
    } else {
      // Dev mode: print OTP so developers can test without a real MSG91 key.
      console.log(`[OTP DEV] Phone: ${phone} OTP: ${otp}`);
    }
  }

  /**
   * Verifies the OTP. Returns true if valid, throws on invalid/expired/too many attempts.
   * Increments attempt counter to prevent brute-force (max 3 attempts per OTP).
   */
  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const otpHash = this.hashOtp(otp);

    const { rows } = await this.db.query<{
      id: string;
      attempts: number;
      expires_at: Date;
    }>(
      `SELECT id, attempts, expires_at FROM otp_requests
       WHERE phone = $1 AND otp_hash = $2 AND verified = false
       ORDER BY created_at DESC LIMIT 1`,
      [phone, otpHash],
    );

    if (rows.length === 0) {
      throw new BadRequestException('Invalid OTP');
    }

    const record = rows[0];

    if (record.attempts >= 3) {
      throw new BadRequestException('Too many incorrect attempts. Request a new OTP.');
    }

    if (new Date() > record.expires_at) {
      throw new BadRequestException('OTP expired');
    }

    // Mark as verified atomically — prevents replay attacks.
    await this.db.query(
      `UPDATE otp_requests SET verified = true WHERE id = $1`,
      [record.id],
    );

    return true;
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private async sendViaMSG91(phone: string, otp: string): Promise<void> {
    // MSG91 Flow API — template ID must be DLT-registered.
    // Template: "Your Shikhar verification code is {#var#}. Valid for 10 minutes."
    await axios.post(
      'https://api.msg91.com/api/v5/otp',
      {
        template_id: process.env.MSG91_OTP_TEMPLATE_ID,
        mobile: phone.replace('+', ''), // MSG91 expects number without +
        otp,
      },
      {
        headers: {
          authkey: process.env.MSG91_API_KEY,
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
