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
import { showNotification }                 from './notifications.js';
import { placePokeballOnMap }               from './pokeballMarker.js';
import { drawRouteToTreasure, clearRoute }  from './mapController.js';
import { drawNextCard }                     from './cardCollection.js';
import { revealCaughtPokemon }              from './cardReveal.js';

// ─── Proximity hints ──────────────────────────────────────────────────────────

/**
 * Return a hot/cold hint whose thresholds scale with the difficulty.
 *
 * Instead of fixed distances (which break at extreme radii like 20 m or 500 m),
 * we map the playable range — from the catch zone out to the search radius —
 * onto four equal quarters.
 *
 *   t = 0  →  right at the Pokéball (catch zone)
 *   t = 1  →  as far as the Pokéball could possibly have been placed
 *
 *   t > 0.75  ❄️  outer quarter   → still far, keep walking
 *   t > 0.50  🌬️  third quarter   → closing in
 *   t > 0.25  ☀️  second quarter  → noticeably warmer
 *   t > 0.00  🔥  inner quarter   → very close
 *   t ≤ 0.00  🌋  catch zone      → right on top of it
 */
function proximityHintFor(distanceMeters) {
    const searchRadius = state.currentPokeballRadius;
    const catchZone    = GAME_CONFIG.catchDistanceMeters;
    const playableRange = searchRadius - catchZone;          // metres between catch edge and max radius

    // Normalise: 0 = at catch boundary, 1 = at maximum possible distance
    const t = (distanceMeters - catchZone) / playableRange;

    if (t > 0.75) return '❄️ Freezing cold… keep walking!';
    if (t > 0.50) return '🌬️ Still cold… getting closer…';
    if (t > 0.25) return '☀️ Warm! You\'re getting there!';
    if (t > 0.00) return '🔥 Hot! Almost there!';
    return               '🌋 BURNING!! The Pokéball is right here!!!';
}

// ─── Treasure placement ───────────────────────────────────────────────────────

/**
 * Drop a new Pokéball at a random spot near the player and draw
 * the walking route to it.
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
    drawRouteToTreasure(state.playerCoords, state.treasureCoords);
}

// ─── Win detection ────────────────────────────────────────────────────────────

/**
 * Called on every GPS update.  Shows a hot/cold hint and triggers the
 * catch celebration when the player is close enough to the Pokéball.
 */
export function checkIfPlayerFoundPokeball() {
    const { playerCoords, treasureCoords, isCollectingCard } = state;
    if (!playerCoords || !treasureCoords || isCollectingCard) return;

    const distanceToTreasure = distanceBetween(playerCoords, treasureCoords);
    showNotification(proximityHintFor(distanceToTreasure));

    if (distanceToTreasure <= GAME_CONFIG.catchDistanceMeters) {
        celebratePokemonCatch();
    }
}

// ─── Catch celebration ────────────────────────────────────────────────────────

function celebratePokemonCatch() {
    state.isCollectingCard = true;
    clearRoute();

    const { card, cycleComplete } = drawNextCard();

    const catchMessage = cycleComplete
        ? `🎉 You've caught 'em all! A new adventure begins!`
        : '⚽ You found the Pokéball! Amazing!';
    showNotification(catchMessage);

    revealCaughtPokemon(card);      // Show the card overlay with fireworks
    placeNewPokeball();             // Place the next Pokéball straight away

    setTimeout(() => {
        state.isCollectingCard = false;
        showNotification('🎮 Let\'s find the next Pokéball!');
    }, GAME_CONFIG.postCelebrationDelayMs);
}

