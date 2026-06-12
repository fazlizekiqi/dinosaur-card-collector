/**
 * game.js — The game orchestrator.
 *
 * This file tells the story of the game at a high level.
 * Each function call reads like a sentence describing what happens next.
 * The implementation details live in the focused modules imported below.
 */

import { state, resetForNewSession }          from './appState.js';
import { GAME_CONFIG, STORAGE_KEYS, APP_ROUTES } from './config.js';

import { resetPlayerMarker,
         placeOrMovePlayerMarker,
         faceDirectionFromHeading,
         injectPlayerMarkerStyles }          from './playerMarker.js';
import { resetPokeballMarker }               from './pokeballMarker.js';

import { createMap,
         flyInToPlayerAndRevealMap,
         centreMapOnPlayer,
         updateRouteStartAsPlayerMoves }     from './mapController.js';

import { startWatchingPlayerPosition }       from './locationTracker.js';
import { requestCompassAndStartListening,
         deviceNeedsGestureForCompassPermission } from './compassTracker.js';

import { initializeCardDeck }                from './cardCollection.js';
import { placeNewPokeball,
         checkIfPlayerFoundPokeball }        from './treasureHunt.js';

import { updateDirectionGuide,
         resetDirectionGuide }                from './directionGuide.js';
import { resetCatchZoneRing }                 from './catchZoneRing.js';
import { showNotification, hideNotification } from './notifications.js';
import { signOutCurrentUser, getFirebaseAuth } from './firebase.js';
import { setupDevPanel }                     from './devPanel.js';

// ─── Entry point ──────────────────────────────────────────────────────────────

export function initGame() {
    // JS modules are cached — state persists between loadGameScreen() calls.
    // Reset everything so a second (or third) sign-in starts completely fresh.
    resetForNewSession();
    resetPlayerMarker();
    resetPokeballMarker();
    resetDirectionGuide();
    resetCatchZoneRing();
    loadSearchRadiusFromSettings();
    initializeCardDeck();

    // Wire up all the UI controls that are present from the start
    wireUpSignOutButton();
    displayCurrentUserProfile();
    wireUpCollectionModal();
    wireUpSettingsModal();
    wireUpCardZoomModal();
    preventDoubleTapZoom();

    // Set up the dev tools panel (keyboard movement + compass tester)
    setupDevPanel(onDevModePositionChanged);

    // Start GPS tracking immediately — no intro modal needed.
    // On iOS the compass needs a user gesture to grant permission; we listen
    // for the player's first tap on the game screen so it feels seamless.
    if (deviceNeedsGestureForCompassPermission) {
        requestCompassPermissionOnFirstPlayerGesture();
    } else {
        requestCompassAndStartListening(onCompassHeadingChanged);
    }
    startWatchingPlayerPosition(onPlayerPositionChanged);

    showNotification('Finding your location…');
}

// ─── Session start ────────────────────────────────────────────────────────────

function startGameSession() {
    requestCompassAndStartListening(onCompassHeadingChanged);
    startWatchingPlayerPosition(onPlayerPositionChanged);
}

/**
 * On iOS 13+ DeviceOrientation permission must come from a user gesture.
 * Instead of forcing the player through an intro modal we simply listen for
 * their first tap on the game screen and silently request permission then.
 */
function requestCompassPermissionOnFirstPlayerGesture() {
    const onFirstGesture = () => {
        requestCompassAndStartListening(onCompassHeadingChanged);
    };
    document.addEventListener('touchstart', onFirstGesture, { once: true });
    document.addEventListener('click',      onFirstGesture, { once: true });
}

// ─── GPS and compass callbacks ────────────────────────────────────────────────

function onPlayerPositionChanged(newCoords) {
    const isFirstKnownPosition = state.map === null;
    state.playerCoords = newCoords;

    if (isFirstKnownPosition) {
        initialiseMapAtPlayerPosition(newCoords);
        return;
    }

    if (!state.isMapReady) return;

    placeOrMovePlayerMarker(newCoords, state.map);
    updateRouteStartAsPlayerMoves(newCoords);
    centreMapOnPlayer(newCoords);
    checkIfPlayerFoundPokeball();
    updateDirectionGuide();
}

function onCompassHeadingChanged(heading) {
    state.compassHeading = heading;
    faceDirectionFromHeading(heading);
    updateDirectionGuide();
}

// ─── Map initialisation ───────────────────────────────────────────────────────

function initialiseMapAtPlayerPosition(coords) {
    const map = createMap(coords);

    map.on('load', () => {
        state.isMapReady = true;
        injectPlayerMarkerStyles();
        placeOrMovePlayerMarker(coords, map);
        placeNewPokeball();
        flyInToPlayerAndRevealMap(coords);
    });
}

// ─── Dev mode position change (keyboard movement) ────────────────────────────

function onDevModePositionChanged(newCoords) {
    placeOrMovePlayerMarker(newCoords, state.map);
    updateRouteStartAsPlayerMoves(newCoords);
    checkIfPlayerFoundPokeball();
    updateDirectionGuide();
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function loadSearchRadiusFromSettings() {
    state.searchRadiusMeters = parseInt(
        localStorage.getItem(STORAGE_KEYS.searchRadius) ||
        String(GAME_CONFIG.defaultSearchRadiusMeters),
        10
    );
}


// ─── Collection modal ─────────────────────────────────────────────────────────

function wireUpCollectionModal() {
    const profileBtn   = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const closeBtn     = document.getElementById('close-profile-btn');

    profileBtn.addEventListener('click', openCollectionModal);
    closeBtn.addEventListener('click', () => profileModal.classList.remove('show'));
    profileModal.addEventListener('click', e => {
        if (e.target === profileModal) profileModal.classList.remove('show');
    });
}

function openCollectionModal() {
    const profileModal  = document.getElementById('profile-modal');
    const cardsGrid     = document.getElementById('profile-cards-grid');
    const emptyMessage  = document.getElementById('profile-empty-msg');
    const cardStore     = document.getElementById('collected-cards');
    const collectedImgs = cardStore ? cardStore.querySelectorAll('img') : [];

    cardsGrid.innerHTML = '';

    if (collectedImgs.length === 0) {
        emptyMessage.style.display = 'block';
    } else {
        emptyMessage.style.display = 'none';
        collectedImgs.forEach(img => {
            const thumb = document.createElement('img');
            thumb.src       = img.src;
            thumb.alt       = img.alt;
            thumb.className = 'profile-card-thumb';
            thumb.addEventListener('click', () => {
                document.getElementById('modal-card-img').src = thumb.src;
                document.getElementById('card-modal').classList.add('show');
                profileModal.classList.remove('show');
            });
            cardsGrid.appendChild(thumb);
        });
    }

    document.getElementById('profile-stats').textContent =
        `${collectedImgs.length} / 28 Pokémon collected`;

    profileModal.classList.add('show');
}

// ─── Settings modal ───────────────────────────────────────────────────────────

function wireUpSettingsModal() {
    const settingsBtn   = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeBtn      = document.getElementById('close-settings-btn');
    const radiusSelect  = document.getElementById('in-game-radius-select');

    if (!settingsBtn || !settingsModal) return;

    if (radiusSelect) {
        radiusSelect.value = String(state.searchRadiusMeters);
        radiusSelect.addEventListener('change', () => {
            localStorage.setItem(STORAGE_KEYS.searchRadius, radiusSelect.value);
            state.searchRadiusMeters = parseInt(radiusSelect.value, 10);
        });
    }

    settingsBtn.addEventListener('click', () => settingsModal.classList.add('show'));
    closeBtn.addEventListener('click', () => settingsModal.classList.remove('show'));
    settingsModal.addEventListener('click', e => {
        if (e.target === settingsModal) settingsModal.classList.remove('show');
    });
}

// ─── Card zoom modal ──────────────────────────────────────────────────────────

function wireUpCardZoomModal() {
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.getElementById('card-modal').classList.remove('show');
    });
}

// ─── User profile ─────────────────────────────────────────────────────────────

function displayCurrentUserProfile() {
    const user     = getFirebaseAuth().currentUser;
    const nameEl   = document.getElementById('profile-username');
    const avatarEl = document.getElementById('profile-avatar');

    if (!user) {
        if (nameEl) nameEl.textContent = 'Guest Explorer';
        return;
    }

    const displayName = user.displayName || user.email || 'Guest Explorer';
    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl && user.photoURL) {
        avatarEl.src           = user.photoURL;
        avatarEl.style.display = 'inline-block';
    }
}

function wireUpSignOutButton() {
    document.getElementById('signout-btn').addEventListener('click', () => {
        signOutCurrentUser()
            .then(() => { window.location.href = APP_ROUTES.homeUrl; })
            .catch(err => { alert('Sign out failed.'); console.error(err); });
    });
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

function preventDoubleTapZoom() {
    let lastTouchTime = 0;
    document.addEventListener('touchend', event => {
        const now = Date.now();
        if (now - lastTouchTime <= 300) event.preventDefault();
        lastTouchTime = now;
    }, { passive: false });
}

