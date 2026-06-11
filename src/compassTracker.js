/**
 * compassTracker.js — Device compass / orientation tracking.
 *
 * Reads the device heading from the DeviceOrientation API and fires a
 * callback whenever the heading changes.  Handles the iOS permission flow
 * that requires the request to come from a direct user gesture.
 */

/**
 * True when the device needs a user-gesture before granting orientation
 * access (i.e. iOS 13+).  Use this flag to decide whether to show a
 * "tap to start" prompt before calling requestCompassAndStartListening().
 */
export const deviceNeedsGestureForCompassPermission =
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function';

/**
 * Request orientation permission (no-op on Android / desktop) and begin
 * listening to the compass.  Must be called from a user-gesture context
 * on iOS 13+.
 *
 * @param {(heading: number) => void} onHeadingChange
 *   Called with the compass heading in degrees (0–359, 0 = north) whenever
 *   the device orientation changes.
 */
export function requestCompassAndStartListening(onHeadingChange) {
    function readHeading(event) {
        let heading;

        if (typeof event.webkitCompassHeading !== 'undefined') {
            // iOS — webkitCompassHeading is already relative to true north
            heading = event.webkitCompassHeading;
        } else if (typeof event.alpha !== 'undefined') {
            // Android / desktop Chrome — convert alpha to a compass bearing
            heading = (360 - event.alpha + 360) % 360;
        }

        if (heading == null) return;
        onHeadingChange(heading);
    }

    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ — must be triggered from a user gesture
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === 'granted') {
                    window.addEventListener('deviceorientation', readHeading, true);
                }
            })
            .catch(() => { /* permission denied – no compass, map still works */ });
    } else {
        // Android / desktop — no permission prompt needed
        window.addEventListener('deviceorientation', readHeading, true);
    }
}

