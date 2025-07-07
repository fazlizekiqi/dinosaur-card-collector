
export function startFireworks() {
    const canvas = document.getElementById('fireworks-canvas');
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    let particles = [];

    function goldColor() {
        // Gold/yellow/orange palette
        const golds = [
            '#FFD700', // gold
            '#FFF700', // bright yellow
            '#FFB300', // orange gold
            '#FFEC8B', // light gold
            '#FFFACD'  // lemon chiffon
        ];
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
            sparkle: Math.random() > 0.7 // 30% chance to sparkle
        };
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (particles.length < 120) {
            for (let i = 0; i < 12; i++) {
                particles.push(createParticle());
            }
        }
        particles.forEach(p => {
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

            // Sparkle effect
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
        particles = particles.filter(p => p.alpha > 0);
        if (particles.length > 0) {
            requestAnimationFrame(animate);
        }
    }
    animate();
}