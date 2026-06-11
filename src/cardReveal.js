/**
 * cardReveal.js — Pokémon card celebration overlay.
 *
 * When the player catches a Pokémon this module presents the card in a
 * full-screen overlay with fireworks.  The card fades out when the player
 * closes it and is then saved to their collection.
 */

import { startFireworks, stopFireworks } from './fireworks.js';
import { saveCardToCollection }          from './cardCollection.js';

/**
 * Show the newly caught Pokémon in the celebration overlay.
 * @param {{ name: string, img: string }} card  – the card to reveal
 */
export function revealCaughtPokemon(card) {
    const overlay  = document.getElementById('t-rex-celebration');
    const cardImg  = overlay?.querySelector('img');
    const closeBtn = document.getElementById('close-card-btn');

    if (!overlay) return;

    if (cardImg) {
        cardImg.src              = card.img;
        cardImg.alt              = card.name;
        cardImg.style.transition = '';
        cardImg.style.transform  = '';
        cardImg.style.opacity    = '1';
    }

    overlay.style.display = 'flex';
    startFireworks();

    // One-time close handler — removes itself after firing
    const onPlayerDismissedCard = () => {
        closeBtn.removeEventListener('click', onPlayerDismissedCard);

        if (cardImg) {
            cardImg.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            cardImg.style.opacity    = '0';
            cardImg.style.transform  = 'scale(0.25)';
        }

        setTimeout(() => {
            saveCardToCollection(card);
            hideCelebrationOverlay();
            if (cardImg) {
                cardImg.style.transition = '';
                cardImg.style.opacity    = '1';
                cardImg.style.transform  = '';
            }
        }, 420);
    };

    closeBtn.addEventListener('click', onPlayerDismissedCard);
}

function hideCelebrationOverlay() {
    const overlay = document.getElementById('t-rex-celebration');
    if (!overlay) return;
    stopFireworks();
    overlay.style.display = 'none';
}

