# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build → /dist
npm run preview   # Preview production build locally
```

No linting or test suite is configured.

## Architecture

Location-based mobile web game where players physically walk to find hidden Pokémon cards. Built with vanilla JS ES modules + Vite, Firebase for auth, and MapLibre GL for rendering.

### State management

All live game data lives in a **single centralized object** in `src/appState.js`. Every module imports from it directly — there is no reactive framework. `resetForNewSession()` wipes state between sign-outs to prevent stale data. Settings persist to localStorage via `STORAGE_KEYS`.

### Module responsibilities

| File | Role |
|------|------|
| `src/game.js` | Main orchestrator — wires GPS/compass callbacks to all other modules |
| `src/appState.js` | Single source of truth for all runtime state |
| `src/config.js` | Firebase credentials, MapTiler URL, OpenRoute Service key, game constants |
| `src/firebase.js` | Auth wrapper (Google OAuth, email/password, anonymous/guest, sign-out) |
| `src/loginScreen.js` | Home screen, auth flows, search-radius setting, loading spinner |
| `src/mapController.js` | MapLibre lifecycle, camera, zoom, route drawing |
| `src/locationTracker.js` | Continuous GPS tracking → updates `state.playerCoords` |
| `src/compassTracker.js` | Device orientation (iOS requires gesture-triggered permission request) |
| `src/playerMarker.js` | Player avatar on map, compass-driven rotation |
| `src/pokeballMarker.js` | Animated treasure marker placement |
| `src/treasureHunt.js` | Core game loop — proximity detection, hot/cold logic, catch-zone check, win |
| `src/cardCollection.js` | 28-card deck, shuffle, draw, collection tracking |
| `src/cardReveal.js` | Full-screen catch celebration overlay |
| `src/visualFeedback.js` | Blue→red screen temperature glow + Pokémon silhouette teaser |
| `src/notifications.js` | Toast messages + spoken audio proximity hints |
| `src/geoUtils.js` | Distance math, random point generation within radius |
| `src/devPanel.js` | Keyboard movement + compass tester (use when testing without physically moving) |
| `src/fireworks.js` | Particle-effect celebration animation |

### Data flow

```
GPS / Compass / DevPanel input
  → locationTracker / compassTracker / devPanel
  → state.playerCoords / state.compassHeading
  → game.js callbacks (onPlayerPositionChanged, onCompassHeadingChanged)
  → treasureHunt (proximity check) + playerMarker (visual update)
  → win → cardReveal + cardCollection
```

### Key design constraints

- **iOS compass**: Permission must be requested inside a user-gesture handler (tap). See `compassTracker.js`.
- **Catch zone scaling**: The catch zone radius is a percentage of `state.currentPokeballRadius` — smaller search radius = harder to catch. Defined in `config.js`.
- **Routing**: Walking directions come from OpenRoute Service API. Requests use an `AbortController` stored in `state.activeFetchController` so stale fetches can be cancelled.
- **Deployment base path**: Vite is configured with `base: '/dinosaur-card-collector/pokemon-collector/'` for GitHub Pages. Don't change this without updating the deployment workflow.

### SPA loading mechanism

`loginScreen.js` runs **top-level module code** (DOM queries and event listeners) the moment it is imported by `index.html`. When the player signs in, `loadGameScreen()` fetches `public/game.html` via `fetch()` and replaces `document.body.innerHTML` wholesale — there is no router. This means `game.js`/`initGame()` only runs after the auth step, and `loginScreen.js` must never import from modules that assume the game DOM exists.

### Dev mode

In the browser console, set `window.devMode = true` to show the heading-tester panel and enable keyboard arrow-key movement. `window.testHeading(degrees)` sets the compass heading directly.

### Coordinate convention

Internal state and function parameters use `[latitude, longitude]`. MapLibre GL and GeoJSON expect `[longitude, latitude]`. The `toGeoJSON()` helper in `mapController.js` performs the swap — always use it when passing coords to the map.

### Card artwork

Pokémon artwork is loaded at runtime from the PokeAPI GitHub CDN (`raw.githubusercontent.com/PokeAPI/sprites`). There are no local Pokémon card images. The `public/dinosaur-cards/` folder contains the original dinosaur cards from a prior version of the game (not used by the current Pokémon card logic).

### Collection persistence

The collected-card store is the hidden `#collected-cards` DOM element. It lives only in memory for the current page session — it is not written to localStorage or Firebase and is cleared on sign-out/reload.

### Deployment

Pushing to the `pokemon-collector` branch triggers `.github/workflows/deploy-pokemon-collector.yml`, which builds with Vite and deploys `dist/` to the `gh-pages` branch under the `pokemon-collector/` subfolder.

### Public assets

Game assets (player direction arrows, cloud overlay, sounds, etc.) live in `public/`. The main game HTML template is `public/game.html` (fetched and injected by `loginScreen.js`).
