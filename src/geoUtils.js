/**
 * geoUtils.js — Pure geographic calculations.
 *
 * These functions are stateless and have no side-effects — they only do
 * the maths.  All coordinates use [latitude, longitude] order unless
 * explicitly noted otherwise.
 */

/**
 * Return a random coordinate within `maxMeters` of the given point.
 * Uses a uniform-disk distribution so results are not biased toward the centre.
 */
export function randomPointNear([lat, lng], maxMeters) {
    const radiusDegrees = maxMeters / 111_000;
    const u             = Math.random();
    const v             = Math.random();
    const w             = radiusDegrees * Math.sqrt(u);
    const angle         = 2 * Math.PI * v;
    const deltaLat      = w * Math.sin(angle);
    const deltaLng      = (w * Math.cos(angle)) / Math.cos((lat * Math.PI) / 180);
    return [lat + deltaLat, lng + deltaLng];
}

/**
 * Haversine distance in metres between two [lat, lng] points.
 */
export function distanceBetween([lat1, lng1], [lat2, lng2]) {
    const EARTH_RADIUS = 6_371_000;
    const radLat1 = (lat1 * Math.PI) / 180;
    const radLat2 = (lat2 * Math.PI) / 180;
    const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(deltaLng / 2) ** 2;
    return EARTH_RADIUS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Initial compass bearing (degrees, 0 = north, clockwise) from point A to point B.
 */
export function bearingBetween([lat1, lng1], [lat2, lng2]) {
    const radLat1  = (lat1 * Math.PI) / 180;
    const radLat2  = (lat2 * Math.PI) / 180;
    const deltaLng = ((lng2 - lng1) * Math.PI) / 180;
    const y = Math.sin(deltaLng) * Math.cos(radLat2);
    const x = Math.cos(radLat1) * Math.sin(radLat2) - Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(deltaLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

