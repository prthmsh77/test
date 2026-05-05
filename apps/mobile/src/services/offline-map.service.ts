/**
 * Offline map tile caching service.
 * Downloads OSM tiles for a trail's bbox and stores them in the Expo file-system cache.
 * The map screen can then use react-native-maps <UrlTile> with file:// URIs to serve
 * tiles when there is no network connectivity.
 *
 * Tile directory layout:
 *   <cacheDir>/offline-maps/<trailId>/<z>/<x>/<y>.png
 */
import * as FileSystem from "expo-file-system";

export interface TileManifest {
  trailId: string;
  trailName: string;
  totalTiles: number;
  estimatedSizeKb: number;
  tiles: Array<{ z: number; x: number; y: number; url: string }>;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
  done: boolean;
  error?: string;
}

const CACHE_DIR = `${FileSystem.cacheDirectory}offline-maps/`;
const MAX_CONCURRENT = 4;

function tileDir(trailId: string) {
  return `${CACHE_DIR}${trailId}/`;
}

function tilePath(trailId: string, z: number, x: number, y: number) {
  return `${tileDir(trailId)}${z}/${x}/${y}.png`;
}

/**
 * Returns the local file:// URL template that react-native-maps <UrlTile> can use.
 * The template has literal {z}/{x}/{y} placeholders.
 */
export function localTileTemplate(trailId: string) {
  return `${tileDir(trailId)}{z}/{x}/{y}.png`;
}

/** Check whether all tiles in the manifest are already cached. */
export async function isTrailCached(trailId: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(tileDir(trailId));
  return info.exists && info.isDirectory === true;
}

/** Delete all cached tiles for a trail (frees storage). */
export async function deleteCachedTrail(trailId: string): Promise<void> {
  await FileSystem.deleteAsync(tileDir(trailId), { idempotent: true });
}

/**
 * Download tiles from the manifest with bounded concurrency.
 * Calls `onProgress` on every completed tile so the UI can show a progress bar.
 * Skips tiles that are already in the cache (resume-safe).
 */
export async function downloadTiles(
  manifest: TileManifest,
  onProgress: (progress: DownloadProgress) => void,
  signal?: { cancelled: boolean }
): Promise<void> {
  let downloaded = 0;
  const total = manifest.tiles.length;

  // Ensure root dir exists
  await FileSystem.makeDirectoryAsync(tileDir(manifest.trailId), { intermediates: true });

  // Process tiles in chunks of MAX_CONCURRENT
  for (let i = 0; i < manifest.tiles.length; i += MAX_CONCURRENT) {
    if (signal?.cancelled) {
      onProgress({ downloaded, total, percent: Math.round((downloaded / total) * 100), done: false, error: "Cancelled" });
      return;
    }

    const chunk = manifest.tiles.slice(i, i + MAX_CONCURRENT);
    await Promise.all(
      chunk.map(async (tile) => {
        const dest = tilePath(manifest.trailId, tile.z, tile.x, tile.y);
        const info = await FileSystem.getInfoAsync(dest);
        if (!info.exists) {
          const dir = `${tileDir(manifest.trailId)}${tile.z}/${tile.x}/`;
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
          try {
            await FileSystem.downloadAsync(tile.url, dest);
          } catch {
            // Non-fatal: skip failed tile (e.g. 404 for ocean/empty tile)
          }
        }
        downloaded++;
        onProgress({
          downloaded,
          total,
          percent: Math.round((downloaded / total) * 100),
          done: downloaded === total,
        });
      })
    );
  }

  onProgress({ downloaded, total, percent: 100, done: true });
}
