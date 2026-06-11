/**
 * pokeballMarker.js — The Pokéball (treasure) marker on the map.
 *
 * Renders an inline SVG Pokéball at the treasure coordinates.
 * Removes the previous marker before placing a new one so there is
 * never more than one Pokéball visible at a time.
 */

import maplibregl from 'maplibre-gl';

const POKEBALL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="50" height="50">
  <path d="M4 32 A28 28 0 0 1 60 32 Z" fill="#cc0000"/>
  <path d="M4 32 A28 28 0 0 0 60 32 Z" fill="#ffffff"/>
  <rect x="4" y="29.5" width="56" height="5" fill="#111111" rx="2"/>
  <circle cx="32" cy="32" r="10" fill="#111111"/>
  <circle cx="32" cy="32" r="7"  fill="#ffffff"/>
  <circle cx="29" cy="29" r="2.5" fill="rgba(255,255,255,0.7)"/>
</svg>`;

let activePokeballMarker = null;

/**
 * Place a Pokéball marker at the given [lat, lng] coordinates.
 * Removes the current marker first if one already exists.
 */
export function placePokeballOnMap(coords, map) {
    if (activePokeballMarker) {
        activePokeballMarker.remove();
        activePokeballMarker = null;
    }

    const [lat, lng] = coords;

    const markerEl = document.createElement('div');
    markerEl.className  = 'pokeball-marker';
    markerEl.style.cssText =
        'width:50px;height:50px;display:flex;align-items:center;justify-content:center;';
    markerEl.innerHTML = POKEBALL_SVG;

    activePokeballMarker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([lng, lat])
        .addTo(map);
}

