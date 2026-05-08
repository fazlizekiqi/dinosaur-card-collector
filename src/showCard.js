import {startFireworks, stopFireworks} from "./game-over.js";
import {showMessage} from "./ui.js";

const BASE = import.meta.env.BASE_URL;

const allCards = [
    `${BASE}dinosaur-cards/ankylosaurus.png`,
    `${BASE}dinosaur-cards/argentinosaurus.png`,
    `${BASE}dinosaur-cards/brachiosaurus.png`,
    `${BASE}dinosaur-cards/parasaurolophus.png`,
    `${BASE}dinosaur-cards/patagotitan.png`,
    `${BASE}dinosaur-cards/t-rex.png`,
    `${BASE}dinosaur-cards/therizinosaurus.png`,
    `${BASE}dinosaur-cards/triceratops.png`
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
        showMessage("🎉 You’ve collected all the dinosaur cards!");
        // Optional reset
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
        img.src = currentCard;
        img.style.transition = "";
        img.style.transform = "";
        img.style.opacity = "1";
    }

    celebration.style.display = "flex";
    startFireworks();

    // After 2s show: shrink & fade the card out, then collect it
    setTimeout(() => {
        if (img) {
            img.style.transition = "opacity 0.6s ease, transform 0.6s ease";
            img.style.opacity = "0";
            img.style.transform = "scale(0.25)";
        }
        setTimeout(() => {
            addCollectedCard(currentCard);
            hideCard();
            // Reset for next use
            if (img) {
                img.style.transition = "";
                img.style.opacity = "1";
                img.style.transform = "";
            }
        }, 650);
    }, 2000);
}

export function hideCard() {
    const celebration = document.getElementById("t-rex-celebration");
    if (!celebration) return;
    stopFireworks();
    celebration.style.display = "none";
}

export function addCollectedCard(cardImageUrl) {
    const container = document.getElementById("collected-cards");
    const img = document.createElement("img");
    img.src = cardImageUrl;
    img.alt = "Collected dinosaur card";
    container.appendChild(img);
}
