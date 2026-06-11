/**
 * firebase.js — Firebase app initialisation and authentication helpers.
 *
 * This module owns the Firebase app instance and exposes clean,
 * intent-revealing sign-in / sign-out functions used by the rest of the app.
 * No other module should call Firebase directly.
 */

import { initializeApp }                                    from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider,
         signInAnonymously, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, signOut }              from 'firebase/auth';
import { FIREBASE_CONFIG }                                  from './config.js';

const firebaseApp  = initializeApp(FIREBASE_CONFIG);
const firebaseAuth = getAuth(firebaseApp);

/** Sign in via a Google popup. Returns a Firebase UserCredential promise. */
export function signInWithGoogle() {
    return signInWithPopup(firebaseAuth, new GoogleAuthProvider());
}

/** Sign in with an existing email / password pair. */
export function signInWithEmail(email, password) {
    return signInWithEmailAndPassword(firebaseAuth, email, password);
}

/** Create a new account with email and password. */
export function createEmailAccount(email, password) {
    return createUserWithEmailAndPassword(firebaseAuth, email, password);
}

/** Continue without an account (anonymous session). */
export function signInAsGuest() {
    return signInAnonymously(firebaseAuth);
}

/** Sign out the currently logged-in user. */
export function signOutCurrentUser() {
    return signOut(firebaseAuth);
}

/** Expose the raw Firebase Auth instance (needed for onAuthStateChanged, currentUser, etc.). */
export function getFirebaseAuth() {
    return firebaseAuth;
}

