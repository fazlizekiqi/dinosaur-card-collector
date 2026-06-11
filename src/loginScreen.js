/**
 * loginScreen.js — Home / login screen.
 *
 * This module handles everything the player sees before the game starts:
 *   • Auth state check — skip straight to the game if already signed in
 *   • Google, guest, and email/password sign-in flows
 *   • Search-radius settings panel
 *   • Loading spinner and inline form error messages
 */

import { onAuthStateChanged }                        from 'firebase/auth';
import { signInWithGoogle, signInWithEmail,
         createEmailAccount, signInAsGuest,
         getFirebaseAuth }                           from './firebase.js';
import { initGame }                                  from './game.js';
import { GAME_CONFIG, STORAGE_KEYS }                 from './config.js';

// ─── Search-radius settings ───────────────────────────────────────────────────

const homeSettingsBtn   = document.getElementById('home-settings-btn');
const homeSettingsModal = document.getElementById('home-settings-modal');
const closeHomeSettings = document.getElementById('close-home-settings');
const radiusHintText    = document.getElementById('radius-hint');

function saveAndHighlightRadius(radiusMeters) {
    localStorage.setItem(STORAGE_KEYS.searchRadius, String(radiusMeters));
    document.querySelectorAll('.radius-opt').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.value === String(radiusMeters));
    });
    if (radiusHintText) {
        radiusHintText.textContent = `Pokéball will be hidden ~${radiusMeters} m from you.`;
    }
}

// Restore saved preference on load
const savedRadius = parseInt(
    localStorage.getItem(STORAGE_KEYS.searchRadius) ||
    String(GAME_CONFIG.defaultSearchRadiusMeters),
    10
);
saveAndHighlightRadius(savedRadius);

document.querySelectorAll('.radius-opt').forEach(btn => {
    btn.addEventListener('click', () => saveAndHighlightRadius(parseInt(btn.dataset.value, 10)));
});

homeSettingsBtn.addEventListener('click', () => { homeSettingsModal.style.display = 'flex'; });
closeHomeSettings.addEventListener('click', () => { homeSettingsModal.style.display = 'none'; });
homeSettingsModal.addEventListener('click', e => {
    if (e.target === homeSettingsModal) homeSettingsModal.style.display = 'none';
});

// ─── Email / register modal ───────────────────────────────────────────────────

const emailModal      = document.getElementById('email-modal');
const loginFormPanel  = document.getElementById('modal-login');
const registerPanel   = document.getElementById('modal-register');
const closeModalBtn   = document.getElementById('close-modal');

function openLoginForm()    { showEmailModal('login'); }
function openRegisterForm() { showEmailModal('register'); }

function showEmailModal(panel) {
    emailModal.style.display        = 'flex';
    loginFormPanel.style.display    = panel === 'login'    ? 'flex' : 'none';
    registerPanel.style.display     = panel === 'register' ? 'flex' : 'none';
    document.body.style.overflow    = 'hidden';
}

function closeEmailModal() {
    emailModal.style.display     = 'none';
    document.body.style.overflow = '';
}

document.getElementById('email-login').addEventListener('click', openLoginForm);
document.getElementById('email-register').addEventListener('click', openRegisterForm);
closeModalBtn.addEventListener('click', closeEmailModal);
emailModal.addEventListener('click', e => { if (e.target === emailModal) closeEmailModal(); });
document.getElementById('switch-to-register').addEventListener('click', e => { e.preventDefault(); openRegisterForm(); });
document.getElementById('switch-to-login').addEventListener('click', e => { e.preventDefault(); openLoginForm(); });

// ─── Loading spinner ──────────────────────────────────────────────────────────

function showLoadingSpinner() {
    let spinner = document.getElementById('global-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'global-spinner';
        Object.assign(spinner.style, {
            position: 'fixed', top: '0', left: '0',
            width: '100vw', height: '100vh',
            background: 'rgba(255,255,255,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: '10001',
        });
        spinner.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="72" height="72">
                <path d="M4 32 A28 28 0 0 1 60 32 Z" fill="#cc0000"/>
                <path d="M4 32 A28 28 0 0 0 60 32 Z" fill="#ffffff"/>
                <rect x="4" y="29.5" width="56" height="5" fill="#111" rx="2"/>
                <circle cx="32" cy="32" r="10" fill="#111"/>
                <circle cx="32" cy="32" r="7" fill="#fff"/>
                <circle cx="29" cy="29" r="2.5" fill="rgba(255,255,255,0.7)"/>
            </svg>`;
        document.body.appendChild(spinner);
    }
    spinner.style.display = 'flex';
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('global-spinner');
    if (spinner) spinner.style.display = 'none';
}

// ─── Inline form errors ───────────────────────────────────────────────────────

function showFormError(message) {
    let errorEl = document.getElementById('modal-error');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id        = 'modal-error';
        errorEl.className = 'modal-error';
        emailModal.querySelector('.modal-card').appendChild(errorEl);
    }
    errorEl.textContent   = message;
    errorEl.style.display = 'block';
}

function clearFormError() {
    const errorEl = document.getElementById('modal-error');
    if (errorEl) errorEl.style.display = 'none';
}

// ─── Loading the game screen ──────────────────────────────────────────────────

function loadGameScreen() {
    fetch('game.html')
        .then(res => res.text())
        .then(html => {
            document.body.innerHTML = html;
            initGame();
        })
        .catch(err => {
            alert('Failed to load game.');
            console.error(err);
        });
}

// ─── Auth state — send logged-in players straight to the game ─────────────────

onAuthStateChanged(getFirebaseAuth(), user => {
    if (user) {
        loadGameScreen();
        return;
    }

    // Not signed in — show the "you are not logged in" banner
    const homeContainer = document.querySelector('.home-container');
    if (!homeContainer) return;

    let banner = document.getElementById('not-logged-message');
    if (!banner) {
        banner = document.createElement('div');
        banner.id        = 'not-logged-message';
        banner.className = 'not-logged-message';
        banner.innerHTML = '<span>🎮 You are not logged in</span>';
        homeContainer.insertBefore(banner, homeContainer.querySelector('.login-card'));
    } else {
        banner.style.display = 'block';
    }
});

// ─── Sign-in button handlers ──────────────────────────────────────────────────

document.getElementById('google-login').addEventListener('click', () => {
    signInWithGoogle()
        .then(() => loadGameScreen())
        .catch(err => console.error('Google sign-in failed:', err));
});

document.getElementById('guest-login').addEventListener('click', () => {
    showLoadingSpinner();
    signInAsGuest()
        .then(() => { hideLoadingSpinner(); loadGameScreen(); })
        .catch(err => { hideLoadingSpinner(); console.error('Guest sign-in failed:', err); });
});

document.getElementById('submit-login').addEventListener('click', async () => {
    clearFormError();
    showLoadingSpinner();
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await signInWithEmail(email, password);
        hideLoadingSpinner();
        closeEmailModal();
        loadGameScreen();
    } catch (err) {
        hideLoadingSpinner();
        showFormError(err.message || 'Login failed.');
    }
});

document.getElementById('submit-register').addEventListener('click', async () => {
    clearFormError();
    showLoadingSpinner();
    const email    = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm  = document.getElementById('register-confirm').value;

    if (password !== confirm) {
        hideLoadingSpinner();
        showFormError('Passwords do not match.');
        return;
    }

    try {
        await createEmailAccount(email, password);
        hideLoadingSpinner();
        closeEmailModal();
        loadGameScreen();
    } catch (err) {
        hideLoadingSpinner();
        showFormError(err.message || 'Registration failed.');
    }
});

