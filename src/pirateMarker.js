// --- Pirate Marker with Arrow ---
import maplibregl from 'maplibre-gl';

const PIRATE_ICON = `${import.meta.env.BASE_URL}palentologist.png`;

// Preload the image so it's always in the browser cache
const _preload = new Image();
_preload.src = PIRATE_ICON;

let userMarker = null;
let pirateIconEl = null;

export function resetPirateMarker() {
    if (userMarker) {
        try { userMarker.remove(); } catch (_) {}
    }
    userMarker = null;
    pirateIconEl = null;
}

const foundCards = [];

export function addCardToUser(card){
    foundCards.push(card);
}

export function createAnimatedPirateIcon() {
    const el = document.createElement('div');
    el.className = 'pirate-marker';
    el.style.cssText = 'position:relative;width:64px;height:64px;display:block;';

    const pirateImg = document.createElement('img');
    pirateImg.alt = "Player";
    pirateImg.style.cssText = 'width:64px;height:64px;position:absolute;left:0;top:0;z-index:1;display:block;';
    pirateImg.className = "bobbing-img";

    // Force a fresh load every time by busting the cache with a timestamp
    pirateImg.src = PIRATE_ICON + '?v=' + Date.now();

    pirateImg.onerror = () => {
        // Retry once without cache-bust in case the ?v= breaks a strict server
        pirateImg.onerror = null;
        pirateImg.src = PIRATE_ICON;
    };

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
    filter: drop-shadow(0 0 6px gold);
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