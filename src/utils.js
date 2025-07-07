
// --- Utility functions ---
export function randomPointNear([lat, lng], maxMeters) {
    const r = maxMeters / 111000;
    const u = Math.random();
    const v = Math.random();
    const w = r * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const dx = w * Math.cos(t);
    const dy = w * Math.sin(t);
    const newLat = lat + dy;
    const newLng = lng + dx / Math.cos(lat * Math.PI / 180);
    return [newLat, newLng];
}


export function distanceMeters([lat1, lng1], [lat2, lng2]) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1)*Math.PI/180;
    const Δλ = (lng2-lng1)*Math.PI/180;
    const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) +
        Math.cos(φ1)*Math.cos(φ2) *
        Math.sin(Δλ/2)*Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

export function getBearingBetween([lat1, lng1], [lat2, lng2]) {
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1)*Math.sin(φ2) -
        Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
    let θ = Math.atan2(y, x);
    θ = θ * 180 / Math.PI;
    return (θ + 360) % 360;
}