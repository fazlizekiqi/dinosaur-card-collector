/**
 * catchZoneRing.js — Pulsing ring on the map showing where "caught" begins.
 *
 * Draws a translucent circle around the active Pokéball with the exact
 * catch-zone radius, so the child can see the goal area on the map and the
 * final metres feel like stepping into a magic circle.
 */

import { state } from './appState.js';

const SOURCE_ID  = 'catch-zone';
const FILL_LAYER = 'catch-zone-fill';
const LINE_LAYER = 'catch-zone-line';

/** Same red-orange as the direction arrow — one colour means "Pokéball!" */
const RING_COLOR = '#ff5a3c';

const CIRCLE_SEGMENTS = 64;
const PULSE_PERIOD_MS = 1_600;

let pulseFrameId = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/** Draw (or move) the catch-zone ring and start its pulse animation. */
export function showCatchZoneRing(centerCoords, radiusMeters) {
    const { map } = state;
    if (!map) return;

    ensureLayersExist(map);
    map.getSource(SOURCE_ID).setData(circlePolygon(centerCoords, radiusMeters));
    startPulse();
}

/** Remove the ring from the map (e.g. during the catch celebration). */
export function hideCatchZoneRing() {
    stopPulse();
    try {
        state.map?.getSource(SOURCE_ID)?.setData(emptyPolygon());
    } catch (_) { /* map already destroyed — nothing to hide */ }
}

/** Stop the animation loop so a fresh session starts clean. */
export function resetCatchZoneRing() {
    stopPulse();
}

// ─── Private: map layers ──────────────────────────────────────────────────────

function ensureLayersExist(map) {
    if (map.getSource(SOURCE_ID)) return;

    map.addSource(SOURCE_ID, { type: 'geojson', data: emptyPolygon() });
    map.addLayer({
        id:     FILL_LAYER,
        type:   'fill',
        source: SOURCE_ID,
        paint:  { 'fill-color': RING_COLOR, 'fill-opacity': 0.12 },
    });
    map.addLayer({
        id:     LINE_LAYER,
        type:   'line',
        source: SOURCE_ID,
        paint:  { 'line-color': RING_COLOR, 'line-width': 3, 'line-opacity': 0.9 },
    });
}

// ─── Private: pulse animation ─────────────────────────────────────────────────

function startPulse() {
    stopPulse();

    function frame(now) {
        const { map } = state;
        try {
            if (!map || !map.getLayer(LINE_LAYER)) { pulseFrameId = null; return; }

            // Smooth 0 → 1 → 0 wave
            const t = (Math.sin((now / PULSE_PERIOD_MS) * 2 * Math.PI) + 1) / 2;
            map.setPaintProperty(LINE_LAYER, 'line-width',   2.5  + t * 2.5);
            map.setPaintProperty(LINE_LAYER, 'line-opacity', 0.45 + t * 0.5);
            map.setPaintProperty(FILL_LAYER, 'fill-opacity', 0.08 + t * 0.10);
        } catch (_) {
            pulseFrameId = null;   // map was torn down mid-frame — stop quietly
            return;
        }
        pulseFrameId = requestAnimationFrame(frame);
    }

    pulseFrameId = requestAnimationFrame(frame);
}

function stopPulse() {
    if (pulseFrameId != null) cancelAnimationFrame(pulseFrameId);
    pulseFrameId = null;
}

// ─── Private: geometry ────────────────────────────────────────────────────────

/** Approximate a metre-radius circle as a GeoJSON polygon. */
function circlePolygon([lat, lng], radiusMeters) {
    const radiusDegrees = radiusMeters / 111_000;
    const ring = [];

    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
        const angle = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
        const dLat  = radiusDegrees * Math.sin(angle);
        const dLng  = (radiusDegrees * Math.cos(angle)) / Math.cos((lat * Math.PI) / 180);
        ring.push([lng + dLng, lat + dLat]);
    }

    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] } };
}

function emptyPolygon() {
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [] } };
}
