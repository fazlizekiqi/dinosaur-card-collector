
let fireworksAnimationId = null; // store animation frame ID globally
let fireworksParticles = [];     // store particles globally for cleanup

export function startFireworks() {
    const canvas = document.getElementById('fireworks-canvas');
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    fireworksParticles = [];

    function goldColor() {
        const golds = ['#FFD700', '#FFF700', '#FFB300', '#FFEC8B', '#FFFACD'];
        return golds[Math.floor(Math.random() * golds.length)];
    }

    function createParticle() {
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 5 + 2;
        return {
            x: canvas.width / 2,
            y: canvas.height / 2,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color: goldColor(),
            sparkle: Math.random() > 0.7
        };
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (fireworksParticles.length < 120) {
            for (let i = 0; i < 12; i++) {
                fireworksParticles.push(createParticle());
            }
        }

        fireworksParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.012;

            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 20;
            ctx.fill();

            // sparkle
            if (p.sparkle && Math.random() > 0.6) {
                ctx.globalAlpha = p.alpha * 0.8;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, 2 * Math.PI);
                ctx.fillStyle = '#FFF';
                ctx.shadowColor = '#FFF';
                ctx.shadowBlur = 30;
                ctx.fill();
            }
        });

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        fireworksParticles = fireworksParticles.filter(p => p.alpha > 0);

        if (fireworksParticles.length > 0) {
            fireworksAnimationId = requestAnimationFrame(animate);
        }
    }

    // Start animation
    fireworksAnimationId = requestAnimationFrame(animate);
}

export function stopFireworks() {
    const canvas = document.getElementById('fireworks-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Stop ongoing animation
    if (fireworksAnimationId) {
        cancelAnimationFrame(fireworksAnimationId);
        fireworksAnimationId = null;
    }

    // Clear particles and canvas
    fireworksParticles = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Optional: hide or remove the canvas
    // canvas.style.display = 'none';
    // OR
    // canvas.remove();
}
