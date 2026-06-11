/**
 * fireworks.js — Celebratory fireworks particle animation.
 *
 * Renders colourful bursting particles on the `#fireworks-canvas` element.
 * Call startFireworks() when the player catches a Pokémon and
 * stopFireworks() when the celebration overlay is dismissed.
 */

let animationFrameId = null;
let particles        = [];

const PARTICLE_COLORS = [
    '#FFD700', '#FFF700', '#FFB300', '#FFEC8B',
    '#FFFACD', '#FF4444', '#FF6B6B', '#cc0000', '#ff0000',
];

function pickRandomColor() {
    return PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
}

function spawnParticle(canvas) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 5 + 2;
    return {
        x:       canvas.width  / 2,
        y:       canvas.height / 2,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed,
        alpha:   1,
        color:   pickRandomColor(),
        sparkle: Math.random() > 0.7,
    };
}

function drawFrame(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Keep spawning until we have a full burst
    if (particles.length < 120) {
        for (let i = 0; i < 12; i++) particles.push(spawnParticle(ctx.canvas));
    }

    particles.forEach(p => {
        p.x     += p.vx;
        p.y     += p.vy;
        p.alpha -= 0.012;

        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle   = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur  = 20;
        ctx.fill();

        if (p.sparkle && Math.random() > 0.6) {
            ctx.globalAlpha = p.alpha * 0.8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5, 0, 2 * Math.PI);
            ctx.fillStyle   = '#FFF';
            ctx.shadowColor = '#FFF';
            ctx.shadowBlur  = 30;
            ctx.fill();
        }
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    particles = particles.filter(p => p.alpha > 0);
}

/** Begin the fireworks animation on the canvas overlay. */
export function startFireworks() {
    const canvas = document.getElementById('fireworks-canvas');
    if (!canvas) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx     = canvas.getContext('2d');
    particles     = [];

    function loop() {
        drawFrame(ctx);
        if (particles.length > 0) animationFrameId = requestAnimationFrame(loop);
    }

    animationFrameId = requestAnimationFrame(loop);
}

/** Stop the animation and clear the canvas. */
export function stopFireworks() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    particles = [];

    const canvas = document.getElementById('fireworks-canvas');
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

