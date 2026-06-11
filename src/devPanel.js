/**
 * devPanel.js — Developer tools for testing the game without physically walking.
 *
 * Creates a floating panel (hidden by default) with:
 *   • a slider to simulate any compass heading
 *   • cardinal-direction shortcut buttons
 *   • keyboard arrow-key movement
 *
 * Activate in the browser console with:  window.devMode = true
 *
 * NOTE: This module is dev-only.  It can be removed or tree-shaken for
 *       a lean production build.
 */

import { state }                     from './appState.js';
import { GAME_CONFIG }               from './config.js';
import { faceDirectionFromHeading }  from './playerMarker.js';
import { centreMapOnPlayer }         from './mapController.js';

/**
 * Attach the dev panel to the DOM and register keyboard movement.
 *
 * @param {(newCoords: [number, number]) => void} onDevPositionChange
 *   Called whenever the keyboard moves the player so the game can
 *   update the marker, route, and win-check without re-initialising the map.
 */
export function setupDevPanel(onDevPositionChange) {
    buildHeadingPanel();
    registerKeyboardMovement(onDevPositionChange);
    exposeConsoleHelpers();
}

// ─── Compass heading tester ───────────────────────────────────────────────────

function buildHeadingPanel() {
    if (document.getElementById('dev-heading-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'dev-heading-panel';
    panel.style.cssText = `
        display:none;position:fixed;bottom:110px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,0.85);color:white;padding:12px 18px;
        border-radius:14px;z-index:99999;flex-direction:column;
        align-items:center;gap:8px;font-size:13px;font-family:sans-serif;
        box-shadow:0 4px 18px rgba(0,0,0,0.6);pointer-events:all;min-width:260px;
    `;
    panel.innerHTML = `
        <span style="font-size:14px;font-weight:bold;">
            🧭 Heading tester — <span id="dev-heading-value">0</span>°
        </span>
        <input id="dev-heading-slider" type="range" min="0" max="359" value="0"
               style="width:230px;accent-color:#FFD700;cursor:pointer;">
        <div style="display:flex;gap:8px;">
            <button data-heading="0"   style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:#555;color:white;font-size:13px;">↑ N</button>
            <button data-heading="90"  style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:#555;color:white;font-size:13px;">→ E</button>
            <button data-heading="180" style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:#555;color:white;font-size:13px;">↓ S</button>
            <button data-heading="270" style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:#555;color:white;font-size:13px;">← W</button>
        </div>
    `;
    document.body.appendChild(panel);

    const slider     = document.getElementById('dev-heading-slider');
    const valueLabel = document.getElementById('dev-heading-value');

    function applyHeading(degrees) {
        const heading      = ((degrees % 360) + 360) % 360;
        valueLabel.textContent = heading;
        slider.value           = heading;
        state.compassHeading   = heading;
        faceDirectionFromHeading(heading);
        if (state.playerCoords) centreMapOnPlayer(state.playerCoords, heading);
    }

    slider.addEventListener('input', () => applyHeading(Number(slider.value)));
    panel.querySelectorAll('button[data-heading]').forEach(btn =>
        btn.addEventListener('click', () => applyHeading(Number(btn.dataset.heading)))
    );

    // Toggle panel visibility when window.devMode is set
    Object.defineProperty(window, 'devMode', {
        get() { return this._devMode ?? false; },
        set(enabled) {
            this._devMode          = enabled;
            panel.style.display    = enabled ? 'flex' : 'none';
            if (enabled) applyHeading(Number(slider.value));
        },
        configurable: true,
    });

    window.devMode = false;
}

// ─── Keyboard movement ────────────────────────────────────────────────────────

function registerKeyboardMovement(onDevPositionChange) {
    document.addEventListener('keydown', event => {
        if (!window.devMode || !state.isMapReady || !state.playerCoords) return;

        const STEP     = GAME_CONFIG.devMoveStepDegrees;
        let [lat, lng] = state.playerCoords;

        switch (event.key) {
            case 'ArrowUp':    lat += STEP; break;
            case 'ArrowDown':  lat -= STEP; break;
            case 'ArrowLeft':  lng -= STEP; break;
            case 'ArrowRight': lng += STEP; break;
            default: return;
        }

        state.playerCoords = [lat, lng];
        onDevPositionChange([lat, lng]);
    });
}

// ─── Console helpers ──────────────────────────────────────────────────────────

function exposeConsoleHelpers() {
    /** Instantly set the player's compass heading from the console. */
    window.testHeading = (degrees) => {
        state.compassHeading = degrees;
        faceDirectionFromHeading(degrees);
        if (state.playerCoords) centreMapOnPlayer(state.playerCoords, degrees);
    };
}

