import { loginWithGoogle, register, continueAsGuest, loginWithEmail } from './auth.js';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const googleBtn = document.getElementById('google-login');
const guestBtn = document.getElementById('guest-login');

// Modal logic for email login/register
const emailModal = document.getElementById('email-modal');
const modalLogin = document.getElementById('modal-login');
const modalRegister = document.getElementById('modal-register');
const closeModalBtn = document.getElementById('close-modal');
const emailLoginBtn = document.getElementById('email-login');
const emailRegisterBtn = document.getElementById('email-register');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');

function showModal(mode) {
    emailModal.style.display = 'flex';
    if (mode === 'login') {
        modalLogin.style.display = 'flex';
        modalRegister.style.display = 'none';
    } else {
        modalLogin.style.display = 'none';
        modalRegister.style.display = 'flex';
    }
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    emailModal.style.display = 'none';
    document.body.style.overflow = '';
}
emailLoginBtn.addEventListener('click', () => showModal('login'));
emailRegisterBtn.addEventListener('click', () => showModal('register'));
closeModalBtn.addEventListener('click', closeModal);
emailModal.addEventListener('click', (e) => {
    if (e.target === emailModal) closeModal();
});
switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    showModal('register');
});
switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    showModal('login');
});

// Spinner and error logic
function showSpinner() {
    let spinner = document.getElementById('global-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'global-spinner';
        spinner.style.position = 'fixed';
        spinner.style.top = '0';
        spinner.style.left = '0';
        spinner.style.width = '100vw';
        spinner.style.height = '100vh';
        spinner.style.background = 'rgba(255,255,255,0.7)';
        spinner.style.display = 'flex';
        spinner.style.alignItems = 'center';
        spinner.style.justifyContent = 'center';
        spinner.style.zIndex = '10001';
        spinner.innerHTML = `<img src="treasure.png" alt="Loading..." class="spinner-egg">`;
        document.body.appendChild(spinner);
    }
    spinner.style.display = 'flex';
}
function hideSpinner() {
    const spinner = document.getElementById('global-spinner');
    if (spinner) spinner.style.display = 'none';
}
function showError(msg) {
    let error = document.getElementById('modal-error');
    if (!error) {
        error = document.createElement('div');
        error.id = 'modal-error';
        error.className = 'modal-error';
        emailModal.querySelector('.modal-card').appendChild(error);
    }
    error.textContent = msg;
    error.style.display = 'block';
}
function hideError() {
    const error = document.getElementById('modal-error');
    if (error) error.style.display = 'none';
}

// Check authentication status on page load
const auth = getAuth();

function loadGame() {
    fetch('game.html')
        .then(response => response.text())
        .then(html => {
            document.body.innerHTML = html;
            // Dynamically inject game.js script
            const script = document.createElement('script');
            script.type = 'module';
            script.src = 'src/game.js';
            document.body.appendChild(script);
        })
        .catch(err => {
            alert('Failed to load game.');
            console.error(err);
        });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is authenticated, load the game
        loadGame();
    } else {
        // User is not authenticated, show home screen and message
        const homeContainer = document.querySelector('.home-container');
        if (homeContainer) {
            let notLoggedMsg = document.getElementById('not-logged-message');
            if (!notLoggedMsg) {
                notLoggedMsg = document.createElement('div');
                notLoggedMsg.id = 'not-logged-message';
                notLoggedMsg.className = 'not-logged-message';
                notLoggedMsg.innerHTML = '<span>🦕 You are not logged in</span>';
                homeContainer.insertBefore(notLoggedMsg, homeContainer.firstChild);
            } else {
                notLoggedMsg.style.display = 'block';
            }
        }
    }
});

googleBtn.addEventListener('click', () => {
    console.log("CALLED")
    loginWithGoogle()
        .then(userCredential => {
            // Handle successful login
            console.log('Google login success:', userCredential);
            loadGame();
        })
        .catch(error => {
            // Handle error
            console.error('Google login error:', error);
        });
});

guestBtn.addEventListener('click', () => {
    showSpinner();
    continueAsGuest()
        .then(userCredential => {
            hideSpinner();
            console.log('Guest login success:', userCredential);
            loadGame();
        })
        .catch(error => {
            hideSpinner();
            console.error('Guest login error:', error);
        });
});



// Login button handler
const submitLogin = document.getElementById('submit-login');
submitLogin.addEventListener('click', async () => {
    hideError();
    showSpinner();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await loginWithEmail(email, password);
        hideSpinner();
        closeModal();
        loadGame();
        // Optionally redirect or show success
    } catch (err) {
        hideSpinner();
        showError(err.message || 'Login failed.');
    }
});

// Register button handler
const submitRegister = document.getElementById('submit-register');
submitRegister.addEventListener('click', async () => {
    hideError();
    showSpinner();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    if (password !== confirm) {
        hideSpinner();
        showError('Passwords do not match.');
        return;
    }
    try {
        await register(email, password);
        hideSpinner();
        closeModal();
        loadGame();
        // Optionally redirect or show success
    } catch (err) {
        hideSpinner();
        showError(err.message || 'Registration failed.');
    }
});
