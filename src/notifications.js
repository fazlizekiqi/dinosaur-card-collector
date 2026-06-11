/**
 * notifications.js — In-game status / hint messages shown and spoken to the player.
 *
 * The single `#game-message` element acts as a toast bar at the top of the
 * game screen.  For young players the hints are also spoken aloud via the
 * Web Speech API — no reading required.
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

// ─── Voice hints ──────────────────────────────────────────────────────────────

let lastSpokenText = '';

/**
 * Speak `text` aloud using the Web Speech API.
 * Only fires when the text changes so GPS ticks don't spam the child.
 * Designed for 4–5 year olds: slower pace, slightly higher pitch.
 */
export function speakHint(text) {
    if (!window.speechSynthesis || text === lastSpokenText) return;
    lastSpokenText = text;
    window.speechSynthesis.cancel();                         // stop any ongoing speech
    const utterance   = new SpeechSynthesisUtterance(text);
    utterance.rate    = 0.88;   // a little slower — easier for young ears
    utterance.pitch   = 1.2;    // slightly higher — friendlier, more playful
    window.speechSynthesis.speak(utterance);
}

/** Reset voice state so the first hint of a new hunt is always spoken. */
export function resetSpokenHints() {
    lastSpokenText = '';
}

