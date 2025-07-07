import {startFireworks} from "./game-over.js";

export function showCard() {
    const celebration = document.getElementById('t-rex-celebration');
    if (celebration) {
        celebration.style.display = 'flex';
        startFireworks();
    }
}