/**
 * cardCollection.js — Pokémon card deck and collection management.
 *
 * Owns the full list of collectable cards, tracks which have been seen
 * this session, and issues the next card each time a Pokéball is found.
 * Pure data logic — no DOM interactions beyond the hidden card store.
 */

const POKEMON_ARTWORK_BASE =
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';

/** The complete set of collectable Pokémon cards. */
const ALL_POKEMON_CARDS = [
    { name: 'Pikachu',       img: `${POKEMON_ARTWORK_BASE}/25.png`  },
    { name: 'Bulbasaur',     img: `${POKEMON_ARTWORK_BASE}/1.png`   },
    { name: 'Charmander',    img: `${POKEMON_ARTWORK_BASE}/4.png`   },
    { name: 'Squirtle',      img: `${POKEMON_ARTWORK_BASE}/7.png`   },
    { name: 'Eevee',         img: `${POKEMON_ARTWORK_BASE}/133.png` },
    { name: 'Jigglypuff',    img: `${POKEMON_ARTWORK_BASE}/39.png`  },
    { name: 'Snorlax',       img: `${POKEMON_ARTWORK_BASE}/143.png` },
    { name: 'Mewtwo',        img: `${POKEMON_ARTWORK_BASE}/150.png` },
    { name: 'Charizard',     img: `${POKEMON_ARTWORK_BASE}/6.png`   },
    { name: 'Venusaur',      img: `${POKEMON_ARTWORK_BASE}/3.png`   },
    { name: 'Blastoise',     img: `${POKEMON_ARTWORK_BASE}/9.png`   },
    { name: 'Gengar',        img: `${POKEMON_ARTWORK_BASE}/94.png`  },
    { name: 'Alakazam',      img: `${POKEMON_ARTWORK_BASE}/65.png`  },
    { name: 'Machamp',       img: `${POKEMON_ARTWORK_BASE}/68.png`  },
    { name: 'Gyarados',      img: `${POKEMON_ARTWORK_BASE}/130.png` },
    { name: 'Lapras',        img: `${POKEMON_ARTWORK_BASE}/131.png` },
    { name: 'Vaporeon',      img: `${POKEMON_ARTWORK_BASE}/134.png` },
    { name: 'Jolteon',       img: `${POKEMON_ARTWORK_BASE}/135.png` },
    { name: 'Flareon',       img: `${POKEMON_ARTWORK_BASE}/136.png` },
    { name: 'Dragonite',     img: `${POKEMON_ARTWORK_BASE}/149.png` },
    { name: 'Articuno',      img: `${POKEMON_ARTWORK_BASE}/144.png` },
    { name: 'Zapdos',        img: `${POKEMON_ARTWORK_BASE}/145.png` },
    { name: 'Moltres',       img: `${POKEMON_ARTWORK_BASE}/146.png` },
    { name: 'Mew',           img: `${POKEMON_ARTWORK_BASE}/151.png` },
    { name: 'Espeon',        img: `${POKEMON_ARTWORK_BASE}/196.png` },
    { name: 'Umbreon',       img: `${POKEMON_ARTWORK_BASE}/197.png` },
    { name: 'Lucario',       img: `${POKEMON_ARTWORK_BASE}/448.png` },
    { name: 'Garchomp',      img: `${POKEMON_ARTWORK_BASE}/445.png` },
];

let remainingCards = [];
let collectedCards = [];
let currentCard    = null;

function shuffleArray(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** Shuffle the deck and reset collection state — call once at game start. */
export function initializeCardDeck() {
    remainingCards = shuffleArray(ALL_POKEMON_CARDS);
    collectedCards = [];
    currentCard    = null;
}

/**
 * Draw the next unseen card from the deck.
 * When the last card has been drawn the deck resets automatically.
 * Returns { card, cycleComplete } where cycleComplete is true on reset.
 */
export function drawNextCard() {
    const cycleComplete = remainingCards.length === 0;

    if (cycleComplete) {
        remainingCards = shuffleArray(ALL_POKEMON_CARDS);
        collectedCards = [];
        const collectionStore = document.getElementById('collected-cards');
        if (collectionStore) collectionStore.innerHTML = '';
    }

    const card = remainingCards.pop();
    collectedCards.push(card);
    currentCard = card;

    return { card, cycleComplete };
}

/** The card that was most recently drawn. */
export function getCurrentCard() {
    return currentCard;
}

/**
 * Peek at the next card that WILL be drawn without removing it from the deck.
 * Used to show the silhouette teaser while the player is hunting.
 * Returns null when the deck is empty (end-of-cycle boundary).
 */
export function peekAtNextCard() {
    if (remainingCards.length === 0) return null;
    return remainingCards[remainingCards.length - 1];
}

/** Number of cards collected so far this cycle. */
export function getCollectedCount() {
    return collectedCards.length;
}

/** Total number of unique cards in the game. */
export function getTotalCardCount() {
    return ALL_POKEMON_CARDS.length;
}

/**
 * Append the card image to the hidden `#collected-cards` container
 * so it shows up later in the profile / collection modal.
 */
export function saveCardToCollection(card) {
    const container = document.getElementById('collected-cards');
    if (!container) return;
    const img = document.createElement('img');
    img.src = card.img;
    img.alt = card.name || 'Collected Pokémon';
    container.appendChild(img);
}

