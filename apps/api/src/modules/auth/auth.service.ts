import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { createHash, randomBytes } from 'crypto';
import { DB_POOL } from '../../database/database.module';

export interface JwtPayload {
  sub: string; // user UUID
  phone: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB_POOL) private readonly db: Pool,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Called after OTP verification succeeds.
   * Creates the user row if it's their first login (phone-first onboarding).
   */
  async loginOrRegister(phone: string): Promise<AuthTokens> {
    let user = await this.findUserByPhone(phone);

    if (!user) {
      const { rows } = await this.db.query<{ id: string; phone: string; role: string }>(
        `INSERT INTO users (phone, name, role) VALUES ($1, $2, 'USER') RETURNING id, phone, role`,
        [phone, phone], // name defaults to phone; user sets it in onboarding
      );
      user = rows[0];
    }

    return this.issueTokens(user!.id, phone, user!.role);
  }

  async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const { rows } = await this.db.query<{
      id: string;
      user_id: string;
      expires_at: Date;
      revoked: boolean;
    }>(
      `SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1`,
      [tokenHash],
    );

    if (rows.length === 0 || rows[0].revoked || new Date() > rows[0].expires_at) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old token, issue new pair.
    await this.db.query(`UPDATE refresh_tokens SET revoked = true WHERE id = $1`, [rows[0].id]);

    const user = await this.findUserById(rows[0].user_id);
    if (!user) throw new UnauthorizedException('User not found');

    return this.issueTokens(user.id, user.phone, user.role);
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.db.query(
      `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`,
      [tokenHash],
    );
  }

  private async issueTokens(
    userId: string,
    phone: string,
    role: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, phone, role };
    const accessToken = this.jwt.sign(payload);

    const rawRefresh = randomBytes(32).toString('hex');
    const refreshHash = this.hashToken(rawRefresh);

    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [userId, refreshHash],
    );

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: 15 * 60, // 15 minutes in seconds
    };
  }

  private async findUserByPhone(
    phone: string,
  ): Promise<{ id: string; phone: string; role: string } | null> {
    const { rows } = await this.db.query<{ id: string; phone: string; role: string }>(
      `SELECT id, phone, role FROM users WHERE phone = $1 AND is_active = true`,
      [phone],
    );
    return rows[0] ?? null;
  }

  private async findUserById(
    id: string,
  ): Promise<{ id: string; phone: string; role: string } | null> {
    const { rows } = await this.db.query<{ id: string; phone: string; role: string }>(
      `SELECT id, phone, role FROM users WHERE id = $1 AND is_active = true`,
      [id],
    );
    return rows[0] ?? null;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
