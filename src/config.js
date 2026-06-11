/**
 * config.js — Central configuration for the Pokémon Card Collector game.
 *
 * All API keys, feature toggles, game constants, and storage keys live here.
 * Change a value here and it propagates everywhere — never hard-code these
 * in individual modules.
 */

// ─── Firebase ─────────────────────────────────────────────────────────────────

export const FIREBASE_CONFIG = {
    apiKey:            'AIzaSyBEDhdaejmYQ4k3X37tHGDHsMKxvkOcTz4',
    authDomain:        'dinosaur-collector-firebase.firebaseapp.com',
    projectId:         'dinosaur-collector-firebase',
    storageBucket:     'dinosaur-collector-firebase.firebasestorage.app',
    messagingSenderId: '197868209787',
    appId:             '1:197868209787:web:2b6e50ffaca3fd43a804de',
};

// ─── Map ──────────────────────────────────────────────────────────────────────

export const MAP_CONFIG = {
    styleUrl:       'https://api.maptiler.com/maps/019eac3b-4543-7181-9c7b-e2694fa514e9/style.json?key=4XkkKpwhltbHeFPyQbNh',
    initialZoom:    2,    // zoom level when the map is first created
    flyInZoom:      17,   // zoom level the camera settles on after the fly-in
    routeSourceId:  'route',
    routeLayerId:   'route-line',
    routeColor:     '#FFD700',
    routeWidth:     4,
};

// ─── Routing API ──────────────────────────────────────────────────────────────

export const ROUTING_CONFIG = {
    apiKey:  'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhjYjhhOGY2ZGQ5MDRmMDA5MWJhYTZiODRhNDQyYzgwIiwiaCI6Im11cm11cjY0In0=',
    baseUrl: 'https://api.openrouteservice.org/v2/directions/foot-walking',
    /** Re-fetch the full route once the player walks farther than this (metres). */
    refetchAfterMeters: 40,
};

// ─── Gameplay ─────────────────────────────────────────────────────────────────

export const GAME_CONFIG = {
    /** Default radius (metres) within which a new Pokéball is placed. */
    defaultSearchRadiusMeters: 150,
    /** Player must be this close (metres) to the Pokéball to catch it. */
    catchDistanceMeters:       15,
    /** Step size in degrees when moving with keyboard in dev mode. */
    devMoveStepDegrees:        0.00025,
    /** Delay (ms) before showing the "find next Pokéball" message. */
    postCelebrationDelayMs:    5000,
};

// ─── Persistence ──────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
    searchRadius: 'pokeballRadius',
};

// ─── App navigation ───────────────────────────────────────────────────────────

export const APP_ROUTES = {
    homeUrl: '/dinosaur-card-collector/pokemon-collector/',
};

