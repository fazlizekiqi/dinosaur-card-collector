/**
 * appState.js — The single source of truth for all live game data.
 *
 * Import `state` anywhere you need to read or write game data.
 * Having one object makes the flow easy to trace and debug — you always
 * know where to look.
 */

export const state = {

    // ── Map ───────────────────────────────────────────────────────────────────
    map:        null,   // MapLibre GL map instance
    isMapReady: false,  // true once the map 'load' event fires

    // ── Player ────────────────────────────────────────────────────────────────
    playerCoords:   null,  // [latitude, longitude] – updated on every GPS tick
    compassHeading: null,  // degrees clockwise from north (0 – 359)

    // ── Treasure ──────────────────────────────────────────────────────────────
    treasureCoords:        null,   // [latitude, longitude] of the active Pokéball
    isCollectingCard:      false,  // true while the win-celebration is playing
    currentPokeballRadius: 150,    // radius (metres) used when this Pokéball was placed

    // ── Walking route ─────────────────────────────────────────────────────────
    activeFetchController: null,  // AbortController for the in-flight route request
    routeWaypoints:        null,  // [[lng, lat], …] path from the routing API
    routeLastFetchedFrom:  null,  // [lat, lng] where the last route fetch was made

    // ── Settings ──────────────────────────────────────────────────────────────
    searchRadiusMeters: 150,  // read from localStorage when the game starts

};

