// --- Pirate Marker with Arrow ---
import maplibregl from 'maplibre-gl';
import {getBearingBetween} from "./utils.js";

const PIRATE_ICON = "palentologist.png";
let userMarker = null;
let pirateIconEl = null;


export function createAnimatedPirateIcon() {
    // Marker container
    const el = document.createElement('div');
    el.className = 'pirate-marker';
    el.style.position = 'relative';
    el.style.width = "64px";
    el.style.height = "64px";

    // Player icon (centered, static)
    const pirateImg = document.createElement('img');
    pirateImg.src = PIRATE_ICON;
    pirateImg.alt = "Player";
    pirateImg.style.width = "64px";
    pirateImg.style.height = "64px";
    pirateImg.style.position = "absolute";
    pirateImg.style.left = "0";
    pirateImg.style.top = "0";
    pirateImg.style.zIndex = 1;
    pirateImg.className = "bobbing-img";

    // BIGGER Arrow (orbiting)
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arrow.setAttribute("id", "arrow");
    arrow.setAttribute("viewBox", "0 0 64 64");
    arrow.setAttribute("width", "64");     // was 32, now 64 for bigger arrow
    arrow.setAttribute("height", "64");
    arrow.style.position = 'absolute';
    arrow.style.left = "0";               // center over player icon
    arrow.style.top = "0";
    arrow.style.transformOrigin = "50% 50%";
    arrow.style.zIndex = 2;
    // arrow.setAttribute("class", "arrow-image");
    arrow.style.pointerEvents = "none";
    arrow.innerHTML = `<polygon points="32,8 44,32 38,32 38,56 26,56 26,32 20,32" fill="gold" stroke="#233" stroke-width="2"/>`;

    el.appendChild(pirateImg);
    el.appendChild(arrow);

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
  
  .arrow-image {
    animation: scale 1.2s infinite ease-in-out;
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
            .setLngLat([coords[1], coords[0]]) // [lng, lat]
            .addTo(map);
        return userMarker;
    } else {

        // 17.959835529327393 59.28586586827325
        userMarker.setLngLat([coords[1], coords[0]]); // [lng, lat]
        return userMarker
    }
}

export function updateArrow(userCoords, treasureCoords, currentHeading) {
    if (!userCoords || !treasureCoords || currentHeading === null) return;
    const bearingToTreasure = getBearingBetween(userCoords, treasureCoords);
    let rotation = bearingToTreasure - currentHeading;
    if (rotation > 180) rotation -= 360;
    if (rotation < -180) rotation += 360;

    if (pirateIconEl) {
        const arrow = pirateIconEl.querySelector('#arrow');
        if (arrow) {
            // Move arrow out from center (e.g. 48px for bigger arrow)
            arrow.style.transform = `rotate(${rotation}deg) translateY(-48px)`;
        }
    }
}