import {startFireworks, stopFireworks} from "./game-over.js";
import {showMessage} from "./ui.js";

const BASE = import.meta.env.BASE_URL;

// Official Pokémon artwork sprites from PokeAPI
const POKEMON_SPRITES_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork';

const allCards = [
    // ── Original 8 ──
    { name: 'Pikachu',       img: `${POKEMON_SPRITES_BASE}/25.png`  },
    { name: 'Bulbasaur',     img: `${POKEMON_SPRITES_BASE}/1.png`   },
    { name: 'Charmander',    img: `${POKEMON_SPRITES_BASE}/4.png`   },
    { name: 'Squirtle',      img: `${POKEMON_SPRITES_BASE}/7.png`   },
    { name: 'Eevee',         img: `${POKEMON_SPRITES_BASE}/133.png` },
    { name: 'Jigglypuff',    img: `${POKEMON_SPRITES_BASE}/39.png`  },
    { name: 'Snorlax',       img: `${POKEMON_SPRITES_BASE}/143.png` },
    { name: 'Mewtwo',        img: `${POKEMON_SPRITES_BASE}/150.png` },
    // ── 20 New Pokémon ──
    { name: 'Charizard',     img: `${POKEMON_SPRITES_BASE}/6.png`   },
    { name: 'Venusaur',      img: `${POKEMON_SPRITES_BASE}/3.png`   },
    { name: 'Blastoise',     img: `${POKEMON_SPRITES_BASE}/9.png`   },
    { name: 'Gengar',        img: `${POKEMON_SPRITES_BASE}/94.png`  },
    { name: 'Alakazam',      img: `${POKEMON_SPRITES_BASE}/65.png`  },
    { name: 'Machamp',       img: `${POKEMON_SPRITES_BASE}/68.png`  },
    { name: 'Gyarados',      img: `${POKEMON_SPRITES_BASE}/130.png` },
    { name: 'Lapras',        img: `${POKEMON_SPRITES_BASE}/131.png` },
    { name: 'Vaporeon',      img: `${POKEMON_SPRITES_BASE}/134.png` },
    { name: 'Jolteon',       img: `${POKEMON_SPRITES_BASE}/135.png` },
    { name: 'Flareon',       img: `${POKEMON_SPRITES_BASE}/136.png` },
    { name: 'Dragonite',     img: `${POKEMON_SPRITES_BASE}/149.png` },
    { name: 'Articuno',      img: `${POKEMON_SPRITES_BASE}/144.png` },
    { name: 'Zapdos',        img: `${POKEMON_SPRITES_BASE}/145.png` },
    { name: 'Moltres',       img: `${POKEMON_SPRITES_BASE}/146.png` },
    { name: 'Mew',           img: `${POKEMON_SPRITES_BASE}/151.png` },
    { name: 'Espeon',        img: `${POKEMON_SPRITES_BASE}/196.png` },
    { name: 'Umbreon',       img: `${POKEMON_SPRITES_BASE}/197.png` },
    { name: 'Lucario',       img: `${POKEMON_SPRITES_BASE}/448.png` },
    { name: 'Garchomp',      img: `${POKEMON_SPRITES_BASE}/445.png` },
];

// Internal state
let remainingCards = [];
let collectedCards = [];
let currentCard = null;

// Fisher–Yates shuffle
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Initialize available cards
export function initializeCards() {
    remainingCards = shuffle([...allCards]);
    collectedCards = [];
    currentCard = null;
}

// Get next unused card
export function getNextCard() {
    if (remainingCards.length === 0) {
        showMessage("🎉 You've caught all 28 Pokémon! Starting over…");
        // Reset
        remainingCards = shuffle([...allCards]);
        collectedCards = [];
        document.getElementById("collected-cards").innerHTML = "";
    }
    const next = remainingCards.pop();
    collectedCards.push(next);
    currentCard = next;
    return next;
}

export function showCard() {
    const celebration = document.getElementById("t-rex-celebration");
    if (!celebration) return;

    const img = celebration.querySelector("img");
    if (img && currentCard) {
        img.src = currentCard.img;
        img.alt = currentCard.name;
        img.style.transition = "";
        img.style.transform = "";
        img.style.opacity = "1";
    }

    celebration.style.display = "flex";
    startFireworks();

    // Wire up the X close button — one-time listener per show
    const closeBtn = document.getElementById("close-card-btn");
    if (closeBtn) {
        const onClose = () => {
            closeBtn.removeEventListener("click", onClose);
            if (img) {
                img.style.transition = "opacity 0.4s ease, transform 0.4s ease";
                img.style.opacity = "0";
                img.style.transform = "scale(0.25)";
            }
            setTimeout(() => {
                addCollectedCard(currentCard);
                hideCard();
                if (img) {
                    img.style.transition = "";
                    img.style.opacity = "1";
                    img.style.transform = "";
                }
            }, 420);
        };
        closeBtn.addEventListener("click", onClose);
    }
}

export function hideCard() {
    const celebration = document.getElementById("t-rex-celebration");
    if (!celebration) return;
    stopFireworks();
    celebration.style.display = "none";
}

export function addCollectedCard(card) {
    const container = document.getElementById("collected-cards");
    const img = document.createElement("img");
    img.src = card.img;
    img.alt = card.name || "Collected Pokémon";
    container.appendChild(img);
}
