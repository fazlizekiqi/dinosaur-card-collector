/**
 * directionGuide.js — Kid-friendly "which way do I walk?" feedback.
 *
 * The map stays north-up and never rotates (rotation was disorienting for a
 * young child).  Instead, a live arrow sweeps around the screen edge,
 * RELATIVE TO WHERE THE DEVICE IS POINTING:
 *
 *   • Pokéball straight ahead → arrow at the top, pointing up.
 *   • Pokéball behind you     → arrow at the bottom, pointing down.
 *   • Turn on the spot        → the arrow orbits the screen in real time.
 *
 * The arrow is always visible during a hunt.  A colour chip backs it up:
 * green ring = walking the right way, red ring = wrong way (with a spoken
 * hint + buzz on the transition), gold ring = no compass available — then
 * the arrow falls back to map-relative (north-up) pointing, which is still
 * correct because the map is north-up and centred on the player.
 */

import { state }           from './appState.js';
import { bearingBetween,
         distanceBetween } from './geoUtils.js';
import { speakHint }       from './notifications.js';

// Hysteresis band: drift past 70° to count as "wrong way", come back within
// 50° to count as "right way".  The 20° gap stops the chip and arrow from
// flickering when the child walks roughly sideways to the target.
const OFF_COURSE_DEGREES = 70;
const ON_COURSE_DEGREES  = 50;

/** Don't repeat spoken direction hints more often than this. */
const SPOKEN_HINT_COOLDOWN_MS = 8_000;

/** How far the arrow sits in from the screen edges. */
const EDGE_MARGIN_PX = 80;

let courseState        = null; // 'on' | 'off' | null (unknown)
let lastSpokenAt       = 0;
let continuousRotation = 0;    // accumulated arrow rotation in degrees (never wraps)

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Recompute the guide from current state.  Call whenever the player moves,
 * the compass heading changes, or a new Pokéball is placed.
 */
export function updateDirectionGuide() {
    const { playerCoords, treasureCoords, compassHeading, isCollectingCard } = state;

    if (!playerCoords || !treasureCoords || isCollectingCard) {
        hideDirectionGuide();
        return;
    }

    const bearingToTreasure = bearingBetween(playerCoords, treasureCoords);
    const metersToTreasure  = Math.round(distanceBetween(playerCoords, treasureCoords));

    // No compass (desktop, or permission denied): fall back to map-relative
    // pointing — still correct because the map is north-up and player-centred.
    if (compassHeading == null) {
        showArrowAt(bearingToTreasure);
        setChip(null, metersToTreasure);
        return;
    }

    // The angle the child must turn through: 0° = Pokéball straight ahead,
    // 180° = directly behind.  This drives both the arrow's spot on the
    // screen edge and its rotation, so it tracks every turn in real time.
    const relativeAngle = (bearingToTreasure - compassHeading + 360) % 360;
    showArrowAt(relativeAngle);

    const drift = smallestAngleBetween(compassHeading, bearingToTreasure);

    if (courseState !== 'off' && drift > OFF_COURSE_DEGREES) {
        courseState = 'off';
        // A short buzz grabs the child's attention without needing words
        // (Android only — iOS Safari has no vibration API)
        navigator.vibrate?.([120, 60, 120]);
        maybeSpeak('Wrong way! Turn around and follow the arrow!');
    } else if (courseState !== 'on' && drift < ON_COURSE_DEGREES) {
        courseState = 'on';
        maybeSpeak('Good job! Keep walking this way!');
    }

    setChip(courseState === 'off' ? 'bad' : 'good', metersToTreasure);
}

/** Hide both the arrow and the chip (e.g. during the catch celebration). */
export function hideDirectionGuide() {
    hideArrow();
    setChip(null);
}

/** Reset all guide state so a fresh session / new hunt starts clean. */
export function resetDirectionGuide() {
    courseState        = null;
    lastSpokenAt       = 0;
    continuousRotation = 0;
    hideDirectionGuide();
}

// ─── Private: DOM helpers ─────────────────────────────────────────────────────

/**
 * Place the arrow on an inset ellipse around the screen centre at the given
 * screen angle (0° = top of screen, 90° = right, 180° = bottom), rotated to
 * point outward in that direction.
 */
function showArrowAt(angleDegrees) {
    const arrow = document.getElementById('direction-guide-arrow');
    if (!arrow) return;

    const radians = (angleDegrees * Math.PI) / 180;
    const dx      = Math.sin(radians);
    const dy      = -Math.cos(radians);
    const x       = window.innerWidth  / 2 + dx * (window.innerWidth  / 2 - EDGE_MARGIN_PX);
    const y       = window.innerHeight / 2 + dy * (window.innerHeight / 2 - EDGE_MARGIN_PX);

    // Accumulate rotation by the shortest step so the CSS transition never
    // whips the long way around when the angle wraps past 359° → 0°.
    continuousRotation += shortestDelta(angleDegrees - continuousRotation);

    arrow.style.left = `${x}px`;
    arrow.style.top  = `${y}px`;
    arrow.style.setProperty('--arrow-rotation', `${Math.round(continuousRotation)}deg`);
    arrow.style.display = 'flex';
}

function hideArrow() {
    const arrow = document.getElementById('direction-guide-arrow');
    if (arrow) arrow.style.display = 'none';
}

/**
 * No words — a 4-year-old can't read.  The ring colour is the child's signal
 * (green = right way, red = wrong way, gold = direction unknown); the metres
 * readout is for the parent.
 * @param {'good' | 'bad' | null} mood  null = no compass available
 * @param {number} [meters] distance left to the Pokéball; omit to hide the chip
 */
function setChip(mood, meters) {
    const chip = document.getElementById('direction-status-chip');
    if (!chip) return;

    if (meters == null) {
        chip.className = '';
        return;
    }

    chip.textContent = `⚽ ${meters} m`;
    chip.className   = mood === 'good' ? 'course-good'
                     : mood === 'bad'  ? 'course-bad'
                     :                   'course-neutral';
}

// ─── Private: maths + voice ───────────────────────────────────────────────────

/** Smallest absolute angle (0–180°) between two compass bearings. */
function smallestAngleBetween(a, b) {
    const diff = Math.abs(a - b) % 360;
    return diff > 180 ? 360 - diff : diff;
}

/** Signed shortest rotation (-180…180°) from the current angle to the target. */
function shortestDelta(degrees) {
    return ((degrees % 360) + 540) % 360 - 180;
}

function maybeSpeak(text) {
    const now = Date.now();
    if (now - lastSpokenAt < SPOKEN_HINT_COOLDOWN_MS) return;
    lastSpokenAt = now;
    speakHint(text);
}
