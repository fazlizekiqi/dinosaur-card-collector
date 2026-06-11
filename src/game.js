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

    // iOS requires a user gesture before we can ask for compass permission.
    // On all other devices we can start tracking right away.
    const isIOSDevice = deviceNeedsGestureForCompassPermission;

    wireUpIntroModal({
        showImmediately: isIOSDevice,
        onPlayerReadyToStart: startGameSession,
    });

    showWelcomeMessage(isIOSDevice);
}

// ─── Session start ────────────────────────────────────────────────────────────

function startGameSession() {
    requestCompassAndStartListening(onCompassHeadingChanged);
    startWatchingPlayerPosition(onPlayerPositionChanged);
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
    centreMapOnPlayer(newCoords, state.compassHeading);
    checkIfPlayerFoundPokeball();
}

function onCompassHeadingChanged(heading) {
    state.compassHeading = heading;
    faceDirectionFromHeading(heading);
    centreMapOnPlayer(state.playerCoords, heading);
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
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function loadSearchRadiusFromSettings() {
    state.searchRadiusMeters = parseInt(
        localStorage.getItem(STORAGE_KEYS.searchRadius) ||
        String(GAME_CONFIG.defaultSearchRadiusMeters),
        10
    );
}

// ─── Intro / trainer modal ────────────────────────────────────────────────────

function wireUpIntroModal({ showImmediately, onPlayerReadyToStart }) {
    const modal    = document.getElementById('dino-collector-modal');
    const closeBtn = document.getElementById('close-dino-modal-btn');
    const openBtn  = document.getElementById('fullscreen-btn');

    // The button in the bottom-left re-opens the trainer modal at any time
    openBtn.addEventListener('click', () => modal.classList.add('show'));

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        // On iOS this button also serves as the "grant permission" gesture
        if (showImmediately) onPlayerReadyToStart();
    });

    if (showImmediately) {
        modal.style.display = 'flex';   // iOS: show before game starts
    } else {
        onPlayerReadyToStart();         // Non-iOS: start immediately
    }
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

function showWelcomeMessage(waitingForGesture) {
    hideNotification();
    showNotification(
        waitingForGesture
            ? "Tap ⚽ Let's go to start!"
            : 'Finding your location…'
    );
}