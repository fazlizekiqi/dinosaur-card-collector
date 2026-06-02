import maplibregl from 'maplibre-gl';

const TREASURE_ICON = `${import.meta.env.BASE_URL}treasure.png`;

// Preload
const _preload = new Image();
_preload.src = TREASURE_ICON;

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
    el.style.cssText = 'width:75px;height:75px;background-size:contain;background-repeat:no-repeat;background-position:center;';

    // Cache-bust to avoid stale/empty cached response
    const img = new Image();
    img.onload = () => {
        el.style.backgroundImage = `url(${img.src})`;
    };
    img.onerror = () => {
        // Retry without cache-bust
        img.onerror = null;
        img.src = TREASURE_ICON;
    };
    img.src = TREASURE_ICON + '?v=' + Date.now();

    container.appendChild(el);

    treasureMarker = new maplibregl.Marker({ element: container })
        .setLngLat([coords[1], coords[0]])
        .addTo(map);
}

