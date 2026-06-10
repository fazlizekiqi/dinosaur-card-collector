import maplibregl from 'maplibre-gl';

// Pokéball inline SVG — no external asset needed
const POKEBALL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="50" height="50">
  <!-- Top half (red) -->
  <path d="M4 32 A28 28 0 0 1 60 32 Z" fill="#cc0000"/>
  <!-- Bottom half (white) -->
  <path d="M4 32 A28 28 0 0 0 60 32 Z" fill="#ffffff"/>
  <!-- Center band (black) -->
  <rect x="4" y="29.5" width="56" height="5" fill="#111111" rx="2"/>
  <!-- Center button (outer black ring) -->
  <circle cx="32" cy="32" r="10" fill="#111111"/>
  <!-- Center button (white) -->
  <circle cx="32" cy="32" r="7" fill="#ffffff"/>
  <!-- Center button (highlight) -->
  <circle cx="29" cy="29" r="2.5" fill="rgba(255,255,255,0.7)"/>
</svg>`;

let treasureMarker;

export function addTreasureMarker(coords, map) {
    if (treasureMarker) {
        treasureMarker.remove();
        treasureMarker = null;
    }

    const container = document.createElement('div');
    container.className = 'treasure-marker-container';

    const el = document.createElement('div');
    el.className = 'treasure-marker';
    el.style.cssText = 'width:50px;height:50px;display:flex;align-items:center;justify-content:center;';
    el.innerHTML = POKEBALL_SVG;

    container.appendChild(el);

    treasureMarker = new maplibregl.Marker({ element: container })
        .setLngLat([coords[1], coords[0]])
        .addTo(map);
}
