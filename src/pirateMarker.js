// --- Pirate Marker with directional sprites ---
import maplibregl from 'maplibre-gl';

const BASE = import.meta.env.BASE_URL;

const DIRECTION_ICONS = {
    north: `${BASE}north.png`,
    east:  `${BASE}east.png`,
    south: `${BASE}south.png`,
    west:  `${BASE}west.png`,
};

// Preload all 4
Object.values(DIRECTION_ICONS).forEach(src => { const i = new Image(); i.src = src; });

let userMarker = null;
let pirateIconEl = null;
let pirateImg = null;
let currentDirection = 'south'; // default facing down

export function resetPirateMarker() {
    if (userMarker) { try { userMarker.remove(); } catch (_) {} }
    userMarker = null;
    pirateIconEl = null;
    pirateImg = null;
}

const foundCards = [];
export function addCardToUser(card) { foundCards.push(card); }

function headingToDirection(heading) {
    // heading: 0/360=N, 90=E, 180=S, 270=W
    if (heading >= 315 || heading < 45)  return 'north';
    if (heading >= 45  && heading < 135) return 'east';
    if (heading >= 135 && heading < 225) return 'south';
    return 'west';
}

export function updateDirectionFromHeading(heading) {
    if (heading === null || heading === undefined) return;
    const dir = headingToDirection(heading);
    if (dir === currentDirection || !pirateImg) return;
    currentDirection = dir;
    const src = DIRECTION_ICONS[dir] + '?v=' + Date.now();
    pirateImg.src = src;
    pirateImg.onerror = () => { pirateImg.onerror = null; pirateImg.src = DIRECTION_ICONS[dir]; };
}

export function createAnimatedPirateIcon() {
    const el = document.createElement('div');
    el.className = 'pirate-marker';
    el.style.cssText = 'position:relative;width:80px;height:80px;display:flex;align-items:center;justify-content:center;';

    pirateImg = document.createElement('img');
    pirateImg.alt = 'Player';
    pirateImg.style.cssText = 'max-width:80px;max-height:80px;width:auto;height:auto;display:block;object-fit:contain;';
    pirateImg.className = 'bobbing-img';
    pirateImg.src = DIRECTION_ICONS[currentDirection] + '?v=' + Date.now();
    pirateImg.onerror = () => { pirateImg.onerror = null; pirateImg.src = DIRECTION_ICONS[currentDirection]; };

    el.appendChild(pirateImg);
    return el;
}

// --- Marker CSS ---
export function injectPirateCSS() {
    const css = `
  @keyframes bob {
    0% { transform: translateY(0);}
    50% { transform: translateY(-10px);}
    100% { transform: translateY(0);}
  }

  @keyframes scale {
    0% { transform: scale(1);}
    50% { transform: scale(1.15);}
    100% { transform: scale(1);}
  }

  .bobbing-img {
    animation: bob 1.2s infinite ease-in-out;
    will-change: transform;
  }

  .pirate-marker {
    filter: drop-shadow(0 2px 40px #0008);
  }
  .treasure-marker {
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
  }
  `;
    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);
}

export function updatePirateMarker(coords, map) {
    if (!userMarker) {
        pirateIconEl = createAnimatedPirateIcon();
        userMarker = new maplibregl.Marker({element: pirateIconEl, anchor: 'center'})
            .setLngLat([coords[1], coords[0]])
            .addTo(map);

        // Force a repaint tick so MapLibre renders the custom element reliably
        requestAnimationFrame(() => {
            if (pirateIconEl) pirateIconEl.style.display = 'block';
        });

        return userMarker;
    } else {
        userMarker.setLngLat([coords[1], coords[0]]);
        return userMarker;
    }
}

export function updateArrow(angleToTreasure) {
    const arrow = document.getElementById('screen-edge-arrow');
    if (!arrow) return;
    if (angleToTreasure === null || angleToTreasure === undefined) return;

    const angle = angleToTreasure; // 0 = up/north, 90 = right
    const rad = (angle * Math.PI) / 180;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = vw / 2;
    const cy = vh / 2;

    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);

    // Padding from screen edge so the 56px arrow is fully visible
    const pad = 36;
    const halfW = cx - pad;
    const halfH = cy - pad;

    const tx = Math.abs(dx) > 0.0001 ? halfW / Math.abs(dx) : Infinity;
    const ty = Math.abs(dy) > 0.0001 ? halfH / Math.abs(dy) : Infinity;
    const t = Math.min(tx, ty);

    const x = cx + dx * t;
    const y = cy + dy * t;

    // Set CSS variable so the bounce animation uses the correct angle
    arrow.style.setProperty('--arrow-angle', `${angle}deg`);
    arrow.style.left = x + 'px';
    arrow.style.top = y + 'px';
    // Use CSS var in transform — animation overrides this but sets the var
    arrow.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    arrow.style.display = 'block';
}