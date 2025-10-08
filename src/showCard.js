import {startFireworks, stopFireworks} from "./game-over.js";
import {showMessage} from "./ui.js";

const allCards = [
    "dinosaur-cards/ankylosaurus.png",
    "dinosaur-cards/argentinosaurus.png",
    "dinosaur-cards/brachiosaurus.png",
    "dinosaur-cards/parasaurolophus.png",
    "dinosaur-cards/patagotitan.png",
    "dinosaur-cards/t-rex.png",
    "dinosaur-cards/therizinosaurus.png",
    "dinosaur-cards/triceratops.png"
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
        img.style.transform = ""; // Reset
        img.style.transition = "transform 0.8s cubic-bezier(0.4, 0.2, 0.2, 1)";
    }

    celebration.style.display = "flex";
    startFireworks();

    setTimeout(() => {
        // Get bounding rects
        const collected = document.getElementById("collected-cards");
        const collectedRect = collected.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        // Calculate translation
        const scale = 0.3;
        const targetX = collectedRect.left + collectedRect.width / 2 - (imgRect.left + imgRect.width / 2);
        const targetY = collectedRect.top + collectedRect.height / 2 - (imgRect.top + imgRect.height / 2);

        img.style.transform = `translate(${targetX}px, ${targetY}px) scale(${scale})`;

        img.addEventListener("transitionend", () => {
            addCollectedCard(currentCard);
            hideCard();
            img.style.transform = ""; // Reset for next time
        }, { once: true });
    }, 2000);
}


export function hideCard() {
    const celebration = document.getElementById("t-rex-celebration");
    if (!celebration) return;
    stopFireworks();

    const img = celebration.querySelector("img");
    if (img) {
        img.src = "t-rex.png"; // revert back when closing
    }

    celebration.style.display = "none";

}

export function addCollectedCard(cardImageUrl) {
    const container = document.getElementById("collected-cards");
    const img = document.createElement("img");
    img.src = cardImageUrl;
    img.alt = "Collected dinosaur card";
    container.appendChild(img);
}
