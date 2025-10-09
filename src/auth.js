// Install Firebase: npm install firebase

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBEDhdaejmYQ4k3X37tHGDHsMKxvkOcTz4",
    authDomain: "dinosaur-collector-firebase.firebaseapp.com",
    projectId: "dinosaur-collector-firebase",
    storageBucket: "dinosaur-collector-firebase.firebasestorage.app",
    messagingSenderId: "197868209787",
    appId: "1:197868209787:web:2b6e50ffaca3fd43a804de"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Google Login
export function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
}

// Register with Email/Password
export function register(email, password) {
    return createUserWithEmailAndPassword(auth, email, password);
}

// Continue as Guest
export function continueAsGuest() {
    return signInAnonymously(auth);
}

// Login with Email/Password
export function loginWithEmail(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
}
