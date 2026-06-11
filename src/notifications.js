/**
 * notifications.js — In-game status / hint messages shown to the player.
 *
 * The single `#game-message` element acts as a toast bar at the top of the
 * game screen.  Use these two helpers instead of touching the DOM directly.
 */

/** Display a message to the player in the status bar. */
export function showNotification(message) {
    const el = document.getElementById('game-message');
    if (!el) return;
    el.textContent   = message;
    el.style.display = 'block';
}

/** Hide the status bar and clear its text. */
export function hideNotification() {
    const el = document.getElementById('game-message');
    if (!el) return;
    el.textContent   = '';
    el.style.display = 'none';
}

