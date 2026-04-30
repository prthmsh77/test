import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../../database/database.module';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-in-production',
      issuer: 'shikhar.app',
    });
  }

  async validate(payload: JwtPayload) {
    // Verify the user still exists and is active on every request.
    // This catches banned/deactivated users without waiting for token expiry.
    const { rows } = await this.db.query<{ id: string; role: string; pro_subscription: boolean }>(
      `SELECT id, role, pro_subscription FROM users WHERE id = $1 AND is_active = true`,
      [payload.sub],
    );

    if (rows.length === 0) {
      throw new UnauthorizedException('User account not found or deactivated');
    }

    // The returned object is attached to request.user by Passport.
    return {
      id: rows[0].id,
      phone: payload.phone,
      role: rows[0].role,
      isPro: rows[0].pro_subscription,
    };
  }
}
