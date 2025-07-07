// --- UI ---
export function showMessage(msg) {
    const el = document.getElementById('game-message');
    el.textContent = msg;
    el.style.display = 'block';
}
export function hideMessage() {
    const el = document.getElementById('game-message');
    el.textContent = '';
    el.style.display = 'none';
}