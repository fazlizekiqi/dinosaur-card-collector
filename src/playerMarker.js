/**
 * playerMarker.js — The player's character sprite on the map.
 *
 * The sprite changes facing direction as the compass heading updates and
 * bobs gently via CSS animation to feel alive on screen.
 */

import maplibregl from 'maplibre-gl';

const BASE = import.meta.env.BASE_URL;

const DIRECTION_SPRITE = {
    north: `${BASE}north.png`,
    east:  `${BASE}east.png`,
    south: `${BASE}south.png`,
    west:  `${BASE}west.png`,
};

// Pre-load all four sprites so direction changes are instant
Object.values(DIRECTION_SPRITE).forEach(src => { new Image().src = src; });

let mapMarker       = null;
let markerWrapper   = null;
let spriteImg       = null;
let facingDirection = 'south'; // default: facing the player / toward the camera

// ─── Public API ───────────────────────────────────────────────────────────────

/** Remove any existing marker so a fresh game session starts clean. */
export function resetPlayerMarker() {
    if (mapMarker) { try { mapMarker.remove(); } catch (_) {} }
    mapMarker     = null;
    markerWrapper = null;
    spriteImg     = null;
}

/**
 * Place the player marker at the given coordinates on first call;
 * simply move it on every subsequent call.
 */
export function placeOrMovePlayerMarker(coords, map) {
    const [lat, lng] = coords;

    if (!mapMarker) {
        markerWrapper = buildPlayerIcon();
        mapMarker = new maplibregl.Marker({ element: markerWrapper, anchor: 'center' })
            .setLngLat([lng, lat])
            .addTo(map);

        // Force a repaint so MapLibre renders the custom element reliably on first load
        requestAnimationFrame(() => {
            if (markerWrapper) markerWrapper.style.display = 'block';
        });
    } else {
        mapMarker.setLngLat([lng, lat]);
    }

    return mapMarker;
}

/**
 * Rotate the player sprite to face the direction matching the compass heading.
 * heading: 0 / 360 = north, 90 = east, 180 = south, 270 = west.
 */
export function faceDirectionFromHeading(heading) {
    if (heading == null || !spriteImg) return;

    const newDirection = compassHeadingToCardinalDirection(heading);
    if (newDirection === facingDirection) return;

    facingDirection = newDirection;
    // Cache-bust timestamp ensures the browser doesn't serve a stale image
    spriteImg.src = `${DIRECTION_SPRITE[newDirection]}?v=${Date.now()}`;
    spriteImg.onerror = () => {
        spriteImg.onerror = null;
        spriteImg.src = DIRECTION_SPRITE[newDirection];
    };
}

/** Inject the CSS keyframe animations needed for the bobbing effect. */
export function injectPlayerMarkerStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes bob {
            0%   { transform: translateY(0); }
            50%  { transform: translateY(-10px); }
            100% { transform: translateY(0); }
        }
        .player-sprite {
            animation: bob 1.2s infinite ease-in-out;
            will-change: transform;
        }
        .player-marker {
            filter: drop-shadow(0 2px 40px #0008);
        }
        .pokeball-marker {
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
        }
    `;
    document.head.appendChild(style);
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildPlayerIcon() {
    const wrapper = document.createElement('div');
    wrapper.className = 'player-marker';
    wrapper.style.cssText =
        'position:relative;width:80px;height:80px;display:flex;align-items:center;justify-content:center;';

    spriteImg           = document.createElement('img');
    spriteImg.alt       = 'Player';
    spriteImg.className = 'player-sprite';
    spriteImg.style.cssText =
        'max-width:80px;max-height:80px;width:auto;height:auto;display:block;object-fit:contain;';
    spriteImg.src = `${DIRECTION_SPRITE[facingDirection]}?v=${Date.now()}`;
    spriteImg.onerror = () => {
        spriteImg.onerror = null;
        spriteImg.src = DIRECTION_SPRITE[facingDirection];
    };

    wrapper.appendChild(spriteImg);
    return wrapper;
}

function compassHeadingToCardinalDirection(heading) {
    if (heading >= 315 || heading < 45)  return 'north';
    if (heading >= 45  && heading < 135) return 'east';
    if (heading >= 135 && heading < 225) return 'south';
    return 'west';
}

