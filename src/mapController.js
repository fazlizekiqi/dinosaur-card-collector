/**
 * mapController.js — Map lifecycle, camera control, walking route, and cloud reveal.
 *
 * Creates and owns the MapLibre GL map instance, animates the camera to follow
 * the player, draws / updates the walking-route overlay, and plays the cloud
 * disperse animation when the map first loads.
 */

import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl            from 'maplibre-gl';
import { state }             from './appState.js';
import { MAP_CONFIG, ROUTING_CONFIG, GAME_CONFIG } from './config.js';
import { distanceBetween }   from './geoUtils.js';

// ─── Map creation ─────────────────────────────────────────────────────────────

/**
 * Create the MapLibre map centred on the player's first known position.
 * Writes the instance to state.map and returns it.
 */
export function createMap(playerCoords) {
    const [lat, lng] = playerCoords;

    const map = new maplibregl.Map({
        container:          'map',
        style:              MAP_CONFIG.styleUrl,
        center:             [lng, lat],
        zoom:               MAP_CONFIG.initialZoom,
        attributionControl: true,
        // The map is always north-up: rotation made it impossible for a young
        // child to keep their bearings.  Direction feedback comes from the
        // directionGuide arrow + chip instead.
        bearing:            0,
        pitch:              0,
        dragRotate:         false,
        pitchWithRotate:    false,
        touchPitch:         false,
    });

    // Two-finger twist rotation must be disabled separately from dragRotate
    map.touchZoomRotate.disableRotation();
    map.keyboard?.disableRotation?.();

    state.map = map;
    return map;
}

// ─── Camera ───────────────────────────────────────────────────────────────────

/**
 * Fly the camera in to the player's position and play the cloud disperse
 * animation.  Locks the zoom level once the fly-in completes.
 *
 * The zoom adapts to the search radius: closer radii zoom in further so the
 * Pokéball is always comfortably visible on screen without extra walking.
 * Each time the radius doubles, the zoom steps one level out (and vice versa).
 */
export function flyInToPlayerAndRevealMap(playerCoords) {
    const { map } = state;
    const [lat, lng] = playerCoords;

    const targetZoom = zoomLevelForSearchRadius(state.searchRadiusMeters);

    playCloudDisperseAnimation();

    map.flyTo({
        center:    [lng, lat],
        zoom:      targetZoom,
        speed:     1.2,
        curve:     1.5,
        essential: true,
    });

    map.once('moveend', () => {
        // Lock the minimum zoom so the player can't accidentally zoom too far out
        // and get disoriented.  The maximum is left open so they can pinch in for
        // more street/building detail whenever they need it.
        map.setMinZoom(targetZoom);
        hideCloudOverlay();
    });
}

/**
 * Calculate the map zoom level for a given search radius.
 * Anchored at zoom 17 for the default 150 m radius.
 * Each doubling of the radius steps one zoom level out; each halving steps in.
 * Capped at zoom 18 — the level where all standard vector tile styles reliably
 * show individual buildings and apartments without over-zooming past the tile data.
 */
function zoomLevelForSearchRadius(radiusMeters) {
    const zoom = MAP_CONFIG.flyInZoom
        - Math.log2(radiusMeters / GAME_CONFIG.defaultSearchRadiusMeters);
    return Math.round(Math.min(18, Math.max(14, zoom)));
}

/**
 * Keep the map centred on the player as they walk.
 * The map never rotates — north stays up so the world doesn't spin underfoot.
 */
export function centreMapOnPlayer(playerCoords) {
    const { map, isMapReady } = state;
    if (!map || !isMapReady || !playerCoords) return;

    const [lat, lng] = playerCoords;
    map.easeTo({ center: [lng, lat], duration: 300 });
}

// ─── Walking route ────────────────────────────────────────────────────────────

/**
 * Draw a walking route from the player to the treasure.
 * A straight dotted line appears immediately; the road-following path
 * replaces it once the routing API responds.
 */
export function drawRouteToTreasure(fromCoords, toCoords) {
    cancelAnyActiveFetch();

    const controller = new AbortController();
    state.activeFetchController = controller;

    // Show a straight-line preview while we await the real route
    renderRouteOnMap([toGeoJSON(fromCoords), toGeoJSON(toCoords)]);
    state.routeWaypoints       = null;
    state.routeLastFetchedFrom = fromCoords;

    fetchWalkingRoute(fromCoords, toCoords, controller.signal)
        .then(waypoints => {
            if (controller.signal.aborted) return;
            state.routeWaypoints       = waypoints;
            state.routeLastFetchedFrom = fromCoords;
            renderRouteOnMap(waypoints);
        })
        .catch(() => {
            // Keep the straight line — walking route unavailable
        });
}

/**
 * Update the start of the current route as the player walks, preserving
 * the road-following geometry.  Re-fetches the whole route if the player
 * has moved too far from the last fetch point.
 */
export function updateRouteStartAsPlayerMoves(fromCoords) {
    const { treasureCoords } = state;
    if (!treasureCoords) return;

    const hasExistingRoute  = state.routeWaypoints && state.routeLastFetchedFrom;
    const hasMovedFarEnough = hasExistingRoute &&
        distanceBetween(fromCoords, state.routeLastFetchedFrom) > ROUTING_CONFIG.refetchAfterMeters;

    if (!hasExistingRoute || hasMovedFarEnough) {
        drawRouteToTreasure(fromCoords, treasureCoords);
        return;
    }

    // Splice the player's current position as the first waypoint
    const updatedWaypoints = [toGeoJSON(fromCoords), ...state.routeWaypoints.slice(1)];
    renderRouteOnMap(updatedWaypoints);
}

/** Remove the route line (e.g. during a win celebration). */
export function clearRoute() {
    cancelAnyActiveFetch();
    state.routeWaypoints       = null;
    state.routeLastFetchedFrom = null;

    if (state.map?.getSource(MAP_CONFIG.routeSourceId)) {
        state.map.getSource(MAP_CONFIG.routeSourceId).setData(emptyLineFeature());
    }
}

// ─── Private: route layer helpers ────────────────────────────────────────────

function ensureRouteLayerExists() {
    const { map } = state;
    if (map.getSource(MAP_CONFIG.routeSourceId)) return;

    map.addSource(MAP_CONFIG.routeSourceId, { type: 'geojson', data: emptyLineFeature() });
    map.addLayer({
        id:     MAP_CONFIG.routeLayerId,
        type:   'line',
        source: MAP_CONFIG.routeSourceId,
        layout: {},
        paint: {
            'line-color':     MAP_CONFIG.routeColor,
            'line-width':     MAP_CONFIG.routeWidth,
            'line-dasharray': [2, 2],
        },
    });
}

function renderRouteOnMap(waypoints) {
    if (!state.map) return;
    ensureRouteLayerExists();
    state.map.getSource(MAP_CONFIG.routeSourceId).setData({
        type:     'Feature',
        geometry: { type: 'LineString', coordinates: waypoints },
    });
}

async function fetchWalkingRoute(from, to, signal) {
    const { apiKey, baseUrl } = ROUTING_CONFIG;
    const url      = `${baseUrl}?api_key=${apiKey}&start=${from[1]},${from[0]}&end=${to[1]},${to[0]}`;
    const response = await fetch(url, { signal });
    const data     = await response.json();
    return data.features[0].geometry.coordinates;
}

function cancelAnyActiveFetch() {
    if (state.activeFetchController) {
        state.activeFetchController.abort();
        state.activeFetchController = null;
    }
}

/** Convert [lat, lng] to GeoJSON [lng, lat] format. */
function toGeoJSON([lat, lng]) { return [lng, lat]; }

function emptyLineFeature() {
    return { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } };
}

// ─── Private: cloud reveal animation ─────────────────────────────────────────

function playCloudDisperseAnimation() {
    const overlay = document.getElementById('cloud-overlay');
    const clouds  = Array.from(
        { length: 8 },
        (_, i) => document.querySelector(`.cloud${i + 1}`)
    ).filter(Boolean);

    overlay.style.display = 'block';
    clouds.forEach(c => { c.style.opacity = '1'; c.style.transform = 'translate(0,0)'; });

    const DURATION_MS  = 2_000;
    const startTime    = performance.now();
    const trajectories = clouds.map(() => {
        const angle    = Math.random() * 2 * Math.PI;
        const distance = 500 + Math.random() * 150;
        return { dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance };
    });

    function animateFrame(now) {
        const progress = Math.min((now - startTime) / DURATION_MS, 1);
        clouds.forEach((cloud, i) => {
            const { dx, dy } = trajectories[i];
            cloud.style.opacity   = String(1 - progress);
            cloud.style.transform = `translate(${progress * dx}px, ${progress * dy}px)`;
        });
        if (progress < 1) requestAnimationFrame(animateFrame);
    }

    requestAnimationFrame(animateFrame);
}

function hideCloudOverlay() {
    const overlay = document.getElementById('cloud-overlay');
    const clouds  = Array.from({ length: 8 }, (_, i) => document.querySelector(`.cloud${i + 1}`)).filter(Boolean);
    setTimeout(() => {
        overlay.style.display = 'none';
        clouds.forEach(c => { c.style.transform = 'translate(0,0)'; });
    }, 200);
}

