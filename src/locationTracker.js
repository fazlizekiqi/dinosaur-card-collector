/**
 * locationTracker.js — GPS geolocation watching.
 *
 * Wraps the browser Geolocation API and calls back with [lat, lng] tuples
 * whenever the device position changes.
 */

import { showNotification } from './notifications.js';

const GPS_OPTIONS      = { enableHighAccuracy: true, timeout: 25_000, maximumAge: 0 };
const WATCH_OPTIONS    = { enableHighAccuracy: true, maximumAge: 2_000, timeout: 7_000 };

/**
 * Start watching the device's GPS position.
 * Fires onPositionUpdate([latitude, longitude]) on every fix.
 */
export function startWatchingPlayerPosition(onPositionUpdate) {
    if (!navigator.geolocation) {
        showNotification('Geolocation is not supported by your browser.');
        return;
    }

    const handlePosition = ({ coords: { latitude, longitude } }) =>
        onPositionUpdate([latitude, longitude]);

    const handleError = () =>
        showNotification('⚓ Location access is required to play. Please enable location.');

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, GPS_OPTIONS);
    navigator.geolocation.watchPosition(handlePosition, handleError, WATCH_OPTIONS);
}

