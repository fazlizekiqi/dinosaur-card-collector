/**
 * visualFeedback.js — Ambient visual feedback for young players.
 *
 * Two features that make the game instantly readable for kids who can't read:
 *
 *  1. Temperature glow  — the whole screen tints blue → amber → orange → red
 *     as the player approaches the Pokéball.  No reading needed; the colour
 *     tells the whole story.
 *
 *  2. Pokémon silhouette teaser — a black "Who's hiding?" silhouette of the
 *     Pokémon inside the next Pokéball is shown while the player is hunting.
 *     It creates anticipation and gives the child a goal they can see.
 */

// ─── Temperature glow ─────────────────────────────────────────────────────────

const GLOW_BY_ZONE = {
    freezing: { color: 'rgba(120, 200, 255, 0.28)', pulse: 'glow-pulse-slow'   },
    cold:     { color: 'rgba(  0,   0,   0, 0.00)', pulse: ''                  },
    warm:     { color: 'rgba(255, 190,  50, 0.22)', pulse: ''                  },
    hot:      { color: 'rgba(255, 110,  20, 0.32)', pulse: 'glow-pulse-medium' },
    burning:  { color: 'rgba(255,  30,  10, 0.48)', pulse: 'glow-pulse-fast'   },
};

/**
 * Tint the game screen based on `t`, the normalised proximity to the Pokéball.
 *   t = 1  →  farthest possible (freezing blue)
 *   t = 0  →  at the catch boundary (burning red)
 *   t < 0  →  inside the catch zone (caught!)
 */
export function updateTemperatureGlow(t) {
    const el = document.getElementById('temperature-glow');
    if (!el) return;

    let zone;
    if      (t > 0.75) zone = GLOW_BY_ZONE.freezing;
    else if (t > 0.50) zone = GLOW_BY_ZONE.cold;
    else if (t > 0.25) zone = GLOW_BY_ZONE.warm;
    else if (t > 0.00) zone = GLOW_BY_ZONE.hot;
    else               zone = GLOW_BY_ZONE.burning;

    el.style.backgroundColor = zone.color;
    el.className = zone.pulse ? `glow-active ${zone.pulse}` : '';
}

/** Remove the glow — called when a Pokéball is caught. */
export function clearTemperatureGlow() {
    const el = document.getElementById('temperature-glow');
    if (!el) return;
    el.style.backgroundColor = 'transparent';
    el.className = '';
}

// ─── Pokémon silhouette teaser ─────────────────────────────────────────────────

/**
 * Show the black silhouette of the next Pokémon in the bottom-left corner.
 * The child knows WHO they are hunting before they find the Pokéball.
 * @param {{ name: string, img: string } | null} card
 */
export function showPokemonSilhouette(card) {
    const teaser = document.getElementById('pokemon-silhouette-teaser');
    const img    = document.getElementById('silhouette-img');
    if (!teaser) return;

    if (!card || !img) {
        teaser.style.display = 'none';
        return;
    }

    img.src              = card.img;
    img.alt              = '???';
    teaser.style.display = 'flex';
}

/** Hide the silhouette — called when a Pokéball is caught. */
export function hidePokemonSilhouette() {
    const teaser = document.getElementById('pokemon-silhouette-teaser');
    if (teaser) teaser.style.display = 'none';
}

