import maplibregl from 'maplibre-gl';

const TREASURE_ICON = "treasure.png";
let treasureMarker;

// --- Treasure Marker ---
export function addTreasureMarker(coords, map) {
    // Create container div
    const container = document.createElement('div');
    container.className = 'treasure-marker-container';

    // Create egg div
    const el = document.createElement('div');
    el.className = 'treasure-marker';
    el.style.width = "75px";
    el.style.height = "75px";
    el.style.backgroundImage = `url(${TREASURE_ICON})`;
    el.style.backgroundSize = "contain";
    el.style.backgroundRepeat = "no-repeat";

    // Nest egg inside container
    container.appendChild(el);

    treasureMarker = new maplibregl.Marker({element: container})
        .setLngLat([coords[1], coords[0]])
        .addTo(map);
}