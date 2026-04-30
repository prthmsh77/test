/**
 * Public live-track page — no app install required.
 * URL: shikhar.app/t/<signed-token>
 *
 * This page is the family/friend view. It receives live GPS pings via WebSocket
 * and renders the trekker's position on a Mapbox map.
 *
 * The token is a signed JWT containing the trek_id; it expires at planned_end + 24h.
 * Full implementation: Phase 4.3.
 */
export default function LiveTrackPage({ params }: { params: { token: string } }) {
  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <h1>🏔️ Shikhar Live Track</h1>
      <p>Track token: <code>{params.token}</code></p>
      <p style={{ color: '#666', maxWidth: 400, textAlign: 'center' }}>
        Live map will be rendered here (Phase 4.3). The trekker's location updates every 15 seconds.
      </p>
    </main>
  );
}
