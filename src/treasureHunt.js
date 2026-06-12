/**
 * treasureHunt.js — The core game loop: finding Pokéballs and catching Pokémon.
 *
 * This module decides when the player has reached the Pokéball, shows the
 * hot / cold proximity hints, and kicks off the card-catch celebration.
 * Think of it as the referee of the game.
 */

import { state }                            from './appState.js';
import { GAME_CONFIG, STORAGE_KEYS }        from './config.js';
import { distanceBetween, randomPointNear } from './geoUtils.js';
import { showNotification,
         speakHint, resetSpokenHints }      from './notifications.js';
import { placePokeballOnMap }               from './pokeballMarker.js';
import { drawRouteToTreasure, clearRoute }  from './mapController.js';
import { drawNextCard, peekAtNextCard }      from './cardCollection.js';
import { revealCaughtPokemon }              from './cardReveal.js';
import { updateTemperatureGlow,
         clearTemperatureGlow,
         showPokemonSilhouette,
         hidePokemonSilhouette }            from './visualFeedback.js';
import { updateDirectionGuide,
         hideDirectionGuide }               from './directionGuide.js';
import { showCatchZoneRing,
         hideCatchZoneRing }                from './catchZoneRing.js';

// ─── Proximity helpers ────────────────────────────────────────────────────────

/**
 * Calculate the catch zone for a given search radius.
 * Scales proportionally so short-range hunts (20 m) still need the child to
 * get genuinely close, while long-range hunts are caught at a comfortable GPS
 * accuracy margin.
 *
 * catch zone = radius × catchZonePercent
 *              clamped to [catchZoneMinMeters … catchZoneMaxMeters]
 */
function catchDistanceForRadius(radiusMeters) {
    const { catchZonePercent, catchZoneMinMeters, catchZoneMaxMeters } = GAME_CONFIG;
    const raw = radiusMeters * catchZonePercent;
    return Math.round(Math.min(catchZoneMaxMeters, Math.max(catchZoneMinMeters, raw)));
}

/**
 * Normalise the player's distance into a 0–1 ratio across the playable range.
 *   1 = as far as the Pokéball could have been placed (freezing)
 *   0 = at the catch boundary (burning)
 */
function computeProximityRatio(distanceMeters) {
    const searchRadius  = state.currentPokeballRadius;
    const catchZone     = catchDistanceForRadius(searchRadius);
    const playableRange = searchRadius - catchZone;
    return (distanceMeters - catchZone) / playableRange;
}

/**
 * Return both a visual (emoji) and spoken hint for the given proximity ratio.
 * Spoken text is deliberately emoji-free and phrased for young children.
 *
 *   t > 0.75  ❄️  outer quarter  → still far, keep walking
 *   t > 0.50  🌬️  third quarter  → closing in
 *   t > 0.25  ☀️  second quarter → noticeably warmer
 *   t > 0.00  🔥  inner quarter  → very close
 *   t ≤ 0.00  🌋  catch zone     → right on top of it
 */
function proximityHintFor(t) {
    if (t > 0.75) return { display: '❄️ Freezing cold… keep walking!',          spoken: 'Brrr! Still far away. Keep walking!' };
    if (t > 0.50) return { display: '🌬️ Still cold… getting closer…',           spoken: 'Getting closer! Keep going!' };
    if (t > 0.25) return { display: '☀️ Warm! You\'re getting there!',           spoken: 'Getting warm! You are getting there!' };
    if (t > 0.00) return { display: '🔥 Hot! Almost there!',                    spoken: 'Hot! Almost there!' };
    return               { display: '🌋 BURNING!! The Pokéball is right here!!!', spoken: 'Burning! The Pokeball is right here!' };
}

// ─── Treasure placement ───────────────────────────────────────────────────────

/**
 * Drop a new Pokéball at a random spot near the player, draw the walking route,
 * and show the silhouette of the Pokémon hidden inside it.
 */
export function placeNewPokeball() {
    const radiusMeters = parseInt(
        localStorage.getItem(STORAGE_KEYS.searchRadius) ||
        String(GAME_CONFIG.defaultSearchRadiusMeters),
        10
    );

    // Remember which radius was used so proximity hints stay consistent
    // for this Pokéball even if the player changes settings mid-hunt.
    state.currentPokeballRadius = radiusMeters;

    state.treasureCoords = randomPointNear(state.playerCoords, radiusMeters);
    placePokeballOnMap(state.treasureCoords, state.map);
    showCatchZoneRing(state.treasureCoords, catchDistanceForRadius(radiusMeters));
    drawRouteToTreasure(state.playerCoords, state.treasureCoords);

    // Show the silhouette of who's hiding in this Pokéball
    showPokemonSilhouette(peekAtNextCard());

    // Point the direction guide at the new Pokéball straight away
    updateDirectionGuide();

    // Reset voice so the first hint of the new hunt is always spoken aloud
    resetSpokenHints();
}

// ─── Win detection ────────────────────────────────────────────────────────────

/**
 * Called on every GPS update.  Updates the glow, speaks the hint, shows it
 * in the toast bar, and triggers the catch celebration when close enough.
 */
export function checkIfPlayerFoundPokeball() {
    const { playerCoords, treasureCoords, isCollectingCard } = state;
    if (!playerCoords || !treasureCoords || isCollectingCard) return;

    const distanceToTreasure = distanceBetween(playerCoords, treasureCoords);
    const proximityRatio     = computeProximityRatio(distanceToTreasure);
    const hint               = proximityHintFor(proximityRatio);

    showNotification(hint.display);
    speakHint(hint.spoken);
    updateTemperatureGlow(proximityRatio);

    if (distanceToTreasure <= catchDistanceForRadius(state.currentPokeballRadius)) {
        celebratePokemonCatch();
    }
}

// ─── Catch celebration ────────────────────────────────────────────────────────

function celebratePokemonCatch() {
    state.isCollectingCard = true;

    // Victory buzz — pairs with the fireworks (Android only; no-op on iOS)
    navigator.vibrate?.([100, 50, 100, 50, 250]);

    clearRoute();
    clearTemperatureGlow();
    hidePokemonSilhouette();
    hideDirectionGuide();
    hideCatchZoneRing();

    const { card, cycleComplete } = drawNextCard();

    const catchMessage = cycleComplete
        ? `🎉 You've caught 'em all! A new adventure begins!`
        : '⚽ You found the Pokéball! Amazing!';
    showNotification(catchMessage);

    revealCaughtPokemon(card);  // Show the card overlay with fireworks
    placeNewPokeball();         // Place the next Pokéball (and show next silhouette)

    setTimeout(() => {
        state.isCollectingCard = false;
        showNotification('🎮 Let\'s find the next Pokéball!');
    }, GAME_CONFIG.postCelebrationDelayMs);
}

