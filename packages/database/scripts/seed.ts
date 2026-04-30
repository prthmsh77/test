/**
 * Seeds the 5 canonical trails from the PRD MVP list:
 * Triund, Kedarkantha, Hampta Pass, Rajmachi, Kalsubai.
 *
 * GPX routes are simplified representative LineStrings (actual curated GPX
 * would be sourced under license from partners like Indiahikes in production).
 */
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'shikhar',
  user: process.env.POSTGRES_USER || 'shikhar',
  password: process.env.POSTGRES_PASSWORD || 'shikhar_dev',
});

interface TrailSeed {
  slug: string;
  name: string;
  region: string;
  difficulty: string;
  maxAltitudeMeters: number;
  distanceKm: number;
  typicalDurationDays: number;
  // Simplified route: array of [lng, lat] pairs (GeoJSON order)
  routeCoords: [number, number][];
  requiresIlp: boolean;
  requiresForestPermit: boolean;
  requiresImfPermit: boolean;
  bestMonths: number[];
  description: string;
}

const SEED_TRAILS: TrailSeed[] = [
  {
    slug: 'triund-trek',
    name: 'Triund Trek',
    region: 'HIMACHAL',
    difficulty: 'EASY',
    maxAltitudeMeters: 2850,
    distanceKm: 9,
    typicalDurationDays: 2,
    routeCoords: [
      [76.3234, 32.2432], // McLeod Ganj trailhead
      [76.3189, 32.2512],
      [76.3145, 32.2601],
      [76.3098, 32.2689], // Magic View Cafe
      [76.3042, 32.2798], // Triund top
    ],
    requiresIlp: false,
    requiresForestPermit: true,
    requiresImfPermit: false,
    bestMonths: [3, 4, 5, 9, 10, 11],
    description:
      'The most accessible Himalayan camping experience. A short but rewarding climb above McLeod Ganj with panoramic views of the Dhauladhar range.',
  },
  {
    slug: 'kedarkantha-winter-trek',
    name: 'Kedarkantha Winter Trek',
    region: 'GARHWAL',
    difficulty: 'MODERATE',
    maxAltitudeMeters: 3810,
    distanceKm: 20,
    typicalDurationDays: 6,
    routeCoords: [
      [78.0234, 31.0823], // Sankri village
      [78.0312, 31.0945],
      [78.0389, 31.1067], // Juda Ka Talab
      [78.0445, 31.1198], // Kedarkantha Base Camp
      [78.0523, 31.1312], // Kedarkantha Summit
    ],
    requiresIlp: false,
    requiresForestPermit: true,
    requiresImfPermit: false,
    bestMonths: [12, 1, 2, 3],
    description:
      'One of India\'s best winter summit treks. Snow-laden pine forests, frozen lakes, and a spectacular 360° summit view. Perfect for first-time Himalayan trekkers.',
  },
  {
    slug: 'hampta-pass-trek',
    name: 'Hampta Pass Trek',
    region: 'HIMACHAL',
    difficulty: 'MODERATE',
    maxAltitudeMeters: 4270,
    distanceKm: 35,
    typicalDurationDays: 5,
    routeCoords: [
      [77.1956, 32.2312], // Jobra, Kullu Valley
      [77.2123, 32.2478],
      [77.2312, 32.2612], // Chika campsite
      [77.2489, 32.2756], // Balu Ka Ghera
      [77.2612, 32.2889], // Hampta Pass (4270m)
      [77.2756, 32.3012], // Shea Goru, Lahaul side
      [77.2912, 32.3156], // Chatru
    ],
    requiresIlp: false,
    requiresForestPermit: false,
    requiresImfPermit: false,
    bestMonths: [6, 7, 8, 9],
    description:
      'A dramatic crossover trek from lush Kullu Valley to the barren moonscape of Lahaul. Crosses a 4270m pass with glacier views. Often combined with Chandratal Lake.',
  },
  {
    slug: 'rajmachi-trek',
    name: 'Rajmachi Fort Trek',
    region: 'WESTERN_GHATS_NORTH',
    difficulty: 'EASY',
    maxAltitudeMeters: 920,
    distanceKm: 16,
    typicalDurationDays: 2,
    routeCoords: [
      [73.4234, 18.7812], // Lonavala / Karjat trailhead
      [73.4312, 18.7934],
      [73.4423, 18.8045],
      [73.4534, 18.8156], // Rajmachi village
      [73.4612, 18.8234], // Shrivardhan Fort
    ],
    requiresIlp: false,
    requiresForestPermit: false,
    requiresImfPermit: false,
    bestMonths: [6, 7, 8, 9, 10, 11],
    description:
      'A classic monsoon overnight trek in the Sahyadri range. Twin forts of Shrivardhan and Manaranjan with sweeping valley views. One of the most popular treks near Mumbai and Pune.',
  },
  {
    slug: 'kalsubai-peak-trek',
    name: 'Kalsubai Peak Trek',
    region: 'WESTERN_GHATS_NORTH',
    difficulty: 'EASY',
    maxAltitudeMeters: 1646,
    distanceKm: 6,
    typicalDurationDays: 1,
    routeCoords: [
      [73.7123, 19.5634], // Bari village base
      [73.7098, 19.5712],
      [73.7067, 19.5801],
      [73.7045, 19.5889], // Kalsubai summit — highest peak in Maharashtra
    ],
    requiresIlp: false,
    requiresForestPermit: false,
    requiresImfPermit: false,
    bestMonths: [6, 7, 8, 9, 10, 11, 12, 1],
    description:
      "Maharashtra's highest peak. A short but steep day hike with chain-assisted sections. Stunning 360° views over the Nashik plateau and the Bhandardara reservoir.",
  },
];

async function seed() {
  const client = await pool.connect();

  try {
    for (const trail of SEED_TRAILS) {
      // Build WKT LineString from coordinates
      const lineStringWkt = `LINESTRING(${trail.routeCoords.map(([lng, lat]) => `${lng} ${lat}`).join(', ')})`;

      await client.query(
        `
        INSERT INTO trails (
          slug, name, region, difficulty,
          max_altitude_meters, distance_km, typical_duration_days,
          route_geography, requires_ilp, requires_forest_permit, requires_imf_permit,
          best_months, description, is_published
        ) VALUES (
          $1, $2, $3::trail_region, $4::trail_difficulty,
          $5, $6, $7,
          ST_GeogFromText($8),
          $9, $10, $11,
          $12, $13, true
        )
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = NOW()
        `,
        [
          trail.slug,
          trail.name,
          trail.region,
          trail.difficulty,
          trail.maxAltitudeMeters,
          trail.distanceKm,
          trail.typicalDurationDays,
          lineStringWkt,
          trail.requiresIlp,
          trail.requiresForestPermit,
          trail.requiresImfPermit,
          trail.bestMonths,
          trail.description,
        ],
      );

      console.log(`[seed] ✓ ${trail.name}`);
    }

    console.log('[seed] All 5 MVP trails seeded successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
