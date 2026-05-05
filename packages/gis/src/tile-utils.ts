/**
 * XYZ tile coordinate utilities for offline map caching.
 * Uses the standard Web Mercator tile scheme (EPSG:3857) as used by OSM, Mapbox, etc.
 */

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Convert a lng/lat to tile x,y at the given zoom level. */
export function lngLatToTile(lng: number, lat: number, z: number): { x: number; y: number } {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * Return all tile coordinates covering a bounding box at the given zoom level.
 * Adds a 1-tile buffer on every side to ensure edge coverage.
 */
export function bboxToTiles(bbox: BBox, z: number): TileCoord[] {
  const topLeft = lngLatToTile(bbox.minLng, bbox.maxLat, z);
  const bottomRight = lngLatToTile(bbox.maxLng, bbox.minLat, z);

  const xMin = Math.max(0, topLeft.x - 1);
  const xMax = Math.min(Math.pow(2, z) - 1, bottomRight.x + 1);
  const yMin = Math.max(0, topLeft.y - 1);
  const yMax = Math.min(Math.pow(2, z) - 1, bottomRight.y + 1);

  const tiles: TileCoord[] = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tiles.push({ z, x, y });
    }
  }
  return tiles;
}

/**
 * Build the full tile list for a bbox across a range of zoom levels.
 * Typical offline pack: minZoom=10 (overview) → maxZoom=14 (detail navigation).
 * Returns total count and per-zoom breakdown.
 */
export function buildTileManifest(
  bbox: BBox,
  minZoom = 10,
  maxZoom = 14,
  urlTemplate = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
): {
  tiles: Array<TileCoord & { url: string }>;
  totalCount: number;
  estimatedSizeKb: number;
} {
  const tiles: Array<TileCoord & { url: string }> = [];

  for (let z = minZoom; z <= maxZoom; z++) {
    for (const t of bboxToTiles(bbox, z)) {
      tiles.push({
        ...t,
        url: urlTemplate.replace('{z}', String(t.z)).replace('{x}', String(t.x)).replace('{y}', String(t.y)),
      });
    }
  }

  // OSM tiles average ~10–25 KB each. Use 15 KB as conservative estimate.
  const estimatedSizeKb = tiles.length * 15;
  return { tiles, totalCount: tiles.length, estimatedSizeKb };
}

/**
 * Expand a bbox by a metre buffer (approximate, suitable for hiking scales).
 * 1 degree lat ≈ 111 km; 1 degree lng ≈ 111 km * cos(lat).
 */
export function bufferBBox(bbox: BBox, bufferMeters: number): BBox {
  const latDelta = bufferMeters / 111_000;
  const midLat = (bbox.minLat + bbox.maxLat) / 2;
  const lngDelta = bufferMeters / (111_000 * Math.cos((midLat * Math.PI) / 180));
  return {
    minLng: bbox.minLng - lngDelta,
    minLat: bbox.minLat - latDelta,
    maxLng: bbox.maxLng + lngDelta,
    maxLat: bbox.maxLat + latDelta,
  };
}
