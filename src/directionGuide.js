/**
 * directionGuide.js — Kid-friendly "are we walking the right way?" feedback.
 *
 * The map stays north-up and never rotates (rotation was disorienting for a
 * young child).  Instead, this module compares the device compass heading
 * with the bearing to the Pokéball and answers one simple question:
 * are we walking toward it or not?
 *
 *   • On course  → small green "This way!" chip at the top of the screen.
 *   • Off course → big bouncing arrow on the edge of the screen pointing
 *     toward the Pokéball, plus a spoken hint to turn around.
 *
 * Because the map is always north-up and centred on the player, the on-screen
 * direction to the Pokéball is exactly its compass bearing — so the arrow
 * points correctly even on devices that have no compass at all.
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

let courseState  = null; // 'on' | 'off' | null (unknown)
let lastSpokenAt = 0;

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

    // No compass (desktop, or permission denied): we can't judge the walking
    // direction, but the arrow still points correctly on a north-up map —
    // so just always show it.
    if (compassHeading == null) {
        showArrowAt(bearingToTreasure);
        setChip(null, metersToTreasure);
        return;
    }

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

    if (courseState === 'off') {
        showArrowAt(bearingToTreasure);
        setChip('bad', metersToTreasure);
    } else {
        hideArrow();
        setChip('good', metersToTreasure);
    }
}

/** Hide both the arrow and the chip (e.g. during the catch celebration). */
export function hideDirectionGuide() {
    hideArrow();
    setChip(null);
}

/** Reset all guide state so a fresh session / new hunt starts clean. */
export function resetDirectionGuide() {
    courseState  = null;
    lastSpokenAt = 0;
    hideDirectionGuide();
}

// ─── Private: DOM helpers ─────────────────────────────────────────────────────

/**
 * Place the arrow on an inset ellipse around the screen centre, at the screen
 * angle matching the bearing (north-up map: 0° = straight up), rotated to
 * point outward toward the Pokéball.
 */
function showArrowAt(bearingDegrees) {
    const arrow = document.getElementById('direction-guide-arrow');
    if (!arrow) return;

    const radians = (bearingDegrees * Math.PI) / 180;
    const dx      = Math.sin(radians);
    const dy      = -Math.cos(radians);
    const x       = window.innerWidth  / 2 + dx * (window.innerWidth  / 2 - EDGE_MARGIN_PX);
    const y       = window.innerHeight / 2 + dy * (window.innerHeight / 2 - EDGE_MARGIN_PX);

    arrow.style.left = `${x}px`;
    arrow.style.top  = `${y}px`;
    arrow.style.setProperty('--arrow-rotation', `${Math.round(bearingDegrees)}deg`);
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

function maybeSpeak(text) {
    const now = Date.now();
    if (now - lastSpokenAt < SPOKEN_HINT_COOLDOWN_MS) return;
    lastSpokenAt = now;
    speakHint(text);
}
