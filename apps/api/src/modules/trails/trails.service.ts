import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../../database/database.module';

@Injectable()
export class TrailsService {
  constructor(@Inject(DB_POOL) private readonly db: Pool) {}

  async findAll(filters?: { region?: string; difficulty?: string; search?: string }) {
    let query = `
      SELECT id, slug, name, region, difficulty,
             max_altitude_meters, distance_km, typical_duration_days,
             requires_ilp, best_months, cover_image_url, description,
             review_count, avg_rating
      FROM trails WHERE is_published = true
    `;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters?.region) {
      query += ` AND region = $${paramIdx++}::trail_region`;
      params.push(filters.region);
    }
    if (filters?.difficulty) {
      query += ` AND difficulty = $${paramIdx++}::trail_difficulty`;
      params.push(filters.difficulty);
    }
    if (filters?.search) {
      // Use trigram similarity for fuzzy name search.
      query += ` AND name % $${paramIdx++}`;
      params.push(filters.search);
    }

    query += ' ORDER BY name';
    const { rows } = await this.db.query(query, params);
    return rows;
  }

  async findBySlug(slug: string) {
    const { rows } = await this.db.query(
      `SELECT t.*,
              ST_AsGeoJSON(t.route_geography)::json AS route_geojson
       FROM trails t WHERE t.slug = $1 AND t.is_published = true`,
      [slug],
    );
    if (!rows[0]) throw new NotFoundException(`Trail "${slug}" not found`);
    return rows[0];
  }

  async getWaypoints(trailId: string) {
    const { rows } = await this.db.query(
      `SELECT id, name, type, altitude_meters, description, network_operator,
              ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
       FROM waypoints WHERE trail_id = $1`,
      [trailId],
    );
    return rows;
  }
}
