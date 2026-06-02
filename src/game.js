import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { showMessage, hideMessage } from './ui.js';
import { showCard, getNextCard, initializeCards } from './showCard.js';
import { addTreasureMarker } from './treasureMarker.js';
import {updatePirateMarker, injectPirateCSS, updateArrow, resetPirateMarker} from './pirateMarker.js';
import { distanceMeters, randomPointNear } from './utils.js';
import { getAuth, signOut } from 'firebase/auth';



export function initGame(){
    resetPirateMarker();

    // Read user-configured radius from settings on home screen (default 150m)
    const TREASURE_DISTANCE_RADIUS = parseInt(localStorage.getItem('eggRadius') || '150', 10);

    // ── All mutable state up front so nothing hits the temporal dead zone ──
    let map;
    let mapLoaded = false;
    let userCoords;
    let treasureCoords;
    let win = false;
    let currentHeading = null;
    let arrowFollowsDevice = true;
    let routeFetchController = null;
    let fetchedRouteCoords   = null;
    let routeFetchedFromCoords = null;

    const MAP_STYLE = "https://api.maptiler.com/maps/0197dc02-f415-76e6-a860-fc5b1805cd22/style.json?key=4XkkKpwhltbHeFPyQbNh";
    const DEFAULT_ZOOM = 15;
    const ROUTE_SOURCE = 'route';
    const ROUTE_LAYER  = 'route-line';
    const REFETCH_DISTANCE_M = 40;
    const moveStep = 0.00025;

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const dinoModal = document.getElementById('dino-collector-modal');
    const closeDinoModalBtn = document.getElementById('close-dino-modal-btn');

    fullscreenBtn.addEventListener('click', () => {
        dinoModal.classList.add('show');
    });

    // "Let's go!" button — used on iOS to bundle both permission prompts in one gesture
    closeDinoModalBtn.addEventListener('click', () => {
        dinoModal.classList.remove('show');
        requestOrientationPermission();
        startTracking();
    });

    // On non-iOS devices there is no orientation permission prompt,
    // so start tracking immediately without waiting for the button
    const needsGestureForPermission =
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function';

    if (!needsGestureForPermission) {
        // Desktop / Android — start right away, register orientation listener too
        requestOrientationPermission();
        startTracking();
    }


    // --- Profile modal ---
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileBtn = document.getElementById('close-profile-btn');

    function openProfileModal() {
        // Render collected cards
        const grid = document.getElementById('profile-cards-grid');
        const emptyMsg = document.getElementById('profile-empty-msg');
        const hiddenCards = document.getElementById('collected-cards');
        const imgs = hiddenCards ? hiddenCards.querySelectorAll('img') : [];
        grid.innerHTML = '';
        if (imgs.length === 0) {
            emptyMsg.style.display = 'block';
        } else {
            emptyMsg.style.display = 'none';
            imgs.forEach(img => {
                const clone = document.createElement('img');
                clone.src = img.src;
                clone.alt = img.alt;
                clone.className = 'profile-card-thumb';
                clone.addEventListener('click', () => {
                    const cardModal = document.getElementById('card-modal');
                    document.getElementById('modal-card-img').src = clone.src;
                    cardModal.classList.add('show');
                    profileModal.classList.remove('show');
                });
                grid.appendChild(clone);
            });
        }
        // Update stats
        document.getElementById('profile-stats').textContent = `${imgs.length} / 8 cards collected`;
        profileModal.classList.add('show');
    }

    profileBtn.addEventListener('click', openProfileModal);
    closeProfileBtn.addEventListener('click', () => profileModal.classList.remove('show'));
    profileModal.addEventListener('click', (e) => { if (e.target === profileModal) profileModal.classList.remove('show'); });

    let lastTouchEnd = 0;

    document.addEventListener('touchend', (event) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);

    const marker = document.querySelector('.maplibregl-user-location-dot');
    if (marker) marker.style.display = 'none';


    function getHotColdMessage(dist) {
        if (dist > 200) return '❄️ Freezing cold… keep walking!';
        if (dist > 100) return '🌬️ Still cold… getting closer…';
        if (dist > 50)  return '☀️ Warm! You\'re getting there!';
        if (dist > 20)  return '🔥 Hot! Almost there!';
        return '🌋 BURNING!! The egg is right here!!!';
    }

    function checkWinCondition() {
        if (!userCoords || !treasureCoords || win) return;
        const dist = distanceMeters(userCoords, treasureCoords);

        showMessage(getHotColdMessage(dist));

        if (dist <= 15) {
            win = true;
            clearRoute();                   // hide old path during celebration
            showMessage('🥚 You found the egg! Amazing!');
            getNextCard();
            showCard();
            generateRandomTreasure();       // place new egg + draw new path immediately
            setTimeout(() => {
                win = false;
                showMessage('🦕 Let\'s find the next egg!');
            }, 5000);
        }
    }


    // Card zoom modal close button
    document.getElementById("close-modal-btn").addEventListener("click", function() {
        document.getElementById("card-modal").classList.remove("show");
    });

    function refreshArrow() {
        // With heading-up mode the map itself shows direction — arrow is hidden
        // Only used by devMode panel
    }

    function applyHeadingToMap(heading) {
        if (!map || !mapLoaded || !userCoords) return;
        // Rotate map so the player's heading always points UP on screen
        map.easeTo({
            bearing: -heading,
            center: [userCoords[1], userCoords[0]],
            duration: 300,
            easing: t => t
        });
    }

    function handleOrientation(event) {
        let heading;
        if (typeof event.webkitCompassHeading !== 'undefined') {
            heading = event.webkitCompassHeading; // iOS — already true north-relative
        } else if (typeof event.alpha !== 'undefined') {
            heading = (360 - event.alpha + 360) % 360;
        }
        if (heading === undefined || heading === null) return;
        currentHeading = heading;
        applyHeadingToMap(heading);
    }

    function requestOrientationPermission() {
        if (!window.DeviceOrientationEvent) return;
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ — must be called from a user gesture
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation, true);
                    }
                })
                .catch(() => {});
        } else {
            // Android / desktop Chrome
            window.addEventListener('deviceorientation', handleOrientation, true);
        }
    }

    function onMapRotate() {
        arrowFollowsDevice = Math.abs(map.getBearing()) <= 1;
    }

    async function fetchRoute(start, end) {
        const apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhjYjhhOGY2ZGQ5MDRmMDA5MWJhYTZiODRhNDQyYzgwIiwiaCI6Im11cm11cjY0In0=';
        const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.features[0].geometry;
    }


    function ensureRouteLayer() {
        if (!map.getSource(ROUTE_SOURCE)) {
            map.addSource(ROUTE_SOURCE, {
                type: 'geojson',
                data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
            });
            map.addLayer({
                id: ROUTE_LAYER,
                type: 'line',
                source: ROUTE_SOURCE,
                layout: {},
                paint: {
                    'line-color': '#FFD700',
                    'line-width': 4,
                    'line-dasharray': [2, 2]
                }
            });
        }
    }

    function setRouteCoords(coordinates) {
        ensureRouteLayer();
        map.getSource(ROUTE_SOURCE).setData({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates }
        });
    }

    function clearRoute() {
        if (routeFetchController) { routeFetchController.abort(); routeFetchController = null; }
        fetchedRouteCoords = null;
        routeFetchedFromCoords = null;
        if (map && map.getSource(ROUTE_SOURCE)) {
            map.getSource(ROUTE_SOURCE).setData(
                { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
            );
        }
    }

    function drawRoute(from, to) {
        // Cancel any previous in-flight fetch
        if (routeFetchController) { routeFetchController.abort(); }
        routeFetchController = new AbortController();
        const { signal } = routeFetchController;

        // Show a straight line immediately while we wait for the walking route
        setRouteCoords([[from[1], from[0]], [to[1], to[0]]]);
        fetchedRouteCoords = null;

        fetchRoute(from, to)
            .then(geometry => {
                if (signal.aborted) return;
                fetchedRouteCoords = geometry.coordinates;
                routeFetchedFromCoords = from;
                setRouteCoords(fetchedRouteCoords);
            })
            .catch(() => {
                // Keep the straight line — no walking route available
            });
    }

    // Called on every GPS tick — updates the user's end of the existing road route
    // without throwing away the road-following geometry.
    function updateRouteStart(from) {
        if (!treasureCoords) return;

        // If we moved far enough from where the route was fetched, re-fetch
        if (
            !fetchedRouteCoords ||
            !routeFetchedFromCoords ||
            distanceMeters(from, routeFetchedFromCoords) > REFETCH_DISTANCE_M
        ) {
            drawRoute(from, treasureCoords);
            return;
        }

        // Splice the user's current position as the new first point of the road route,
        // keeping all the road-following waypoints intact
        const updated = [[from[1], from[0]], ...fetchedRouteCoords.slice(1)];
        setRouteCoords(updated);
        refreshArrow();
    }

    function generateRandomTreasure() {
        treasureCoords = randomPointNear(userCoords, TREASURE_DISTANCE_RADIUS);
        addTreasureMarker(treasureCoords, map);
        drawRoute(userCoords, treasureCoords);
        refreshArrow();
    }

// --- Main Game Flow ---
    function onPosition(position) {
        const {latitude, longitude} = position.coords;
        userCoords = [latitude, longitude];

        if (!map) {
            map = new maplibregl.Map({
                container: 'map',
                style: MAP_STYLE,
                center: [longitude, latitude],
                zoom: 2,
                attributionControl: true
            });

            map.on('load', () => {
                mapLoaded = true;
                injectPirateCSS();
                generateRandomTreasure();
                updatePirateMarker(userCoords, map);
                enablePirateMovement(map);
                const cloudOverlay = document.getElementById('cloud-overlay');
                const clouds = [
                    document.querySelector('.cloud1'),
                    document.querySelector('.cloud2'),
                    document.querySelector('.cloud3'),
                    document.querySelector('.cloud4'),
                    document.querySelector('.cloud5'),
                    document.querySelector('.cloud6'),
                    document.querySelector('.cloud7'),
                    document.querySelector('.cloud8')
                ];

                cloudOverlay.style.display = 'block';
                clouds.forEach(cloud => {
                    cloud.style.opacity = '1';
                    cloud.style.transform = 'translate(0,0)';
                });

                const transitionDuration = 2000; // ms
                const startTime = performance.now();

                const cloudMovements = clouds.map(() => {
                    const angle = Math.random() * 2 * Math.PI; // random angle in radians
                    const distance = 500 + Math.random() * 150; // random distance between 120 and 270 px
                    return {
                        dx: Math.cos(angle) * distance,
                        dy: Math.sin(angle) * distance
                    };
                });

                function animateClouds(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / transitionDuration, 1);


                    clouds.forEach((cloud, i) => {
                        cloud.style.opacity = String(1 - progress);
                        const { dx, dy } = cloudMovements[i];
                        cloud.style.transform = `translate(${progress * dx}px, ${progress * dy}px)`;
                    });

                    if (progress < 1) {
                        requestAnimationFrame(animateClouds);
                    }
                }

                map.flyTo({
                    center: [longitude, latitude],
                    zoom: DEFAULT_ZOOM + 2,
                    speed: 1.2,
                    curve: 1.5,

                    essential: true
                });


                requestAnimationFrame(animateClouds);

                map.once('moveend', () => {
                    map.setMinZoom(DEFAULT_ZOOM + 2);
                    map.setMaxZoom(DEFAULT_ZOOM + 2);
                    setTimeout(() => {
                        cloudOverlay.style.display = 'none';
                        clouds.forEach(cloud => { cloud.style.transform = 'translate(0,0)'; });
                    }, 200);
                });

                map.on('rotate', onMapRotate);
                map.on('dragrotate', onMapRotate);
            });
        } else {
            if (!mapLoaded) return;
            updatePirateMarker(userCoords, map);
            updateRouteStart(userCoords);
            // Keep map centered on player as they walk
            if (currentHeading !== null) {
                applyHeadingToMap(currentHeading);
            } else {
                map.easeTo({ center: [userCoords[1], userCoords[0]], duration: 300 });
            }
        }
        checkWinCondition();
    }

    function onError() {
        showMessage('⚓ Location access is required to play the game. Please enable location.');
    }

    function startTracking() {
        if (!navigator.geolocation) {
            showMessage('Geolocation is not supported by your browser.');
            return;
        }
        showMessage('Go find that egg.');
        navigator.geolocation.getCurrentPosition(onPosition, onError, {
            enableHighAccuracy: true,
            timeout: 25000,
            maximumAge: 0
        });
        navigator.geolocation.watchPosition(pos => {
            onPosition(pos);
        }, onError, {enableHighAccuracy: true, maximumAge: 2000, timeout: 7000});
    }


    // ============================================================
    // DEV ONLY — remove this block before deploying to production
    // ============================================================
    (function setupDevArrowPanel() {
        if (document.getElementById('dev-orient-panel')) return;
        const wrap = document.createElement('div');
        wrap.id = 'dev-orient-panel';
        wrap.style.cssText = `
            display:none;position:fixed;bottom:110px;left:50%;transform:translateX(-50%);
            background:rgba(0,0,0,0.85);color:white;padding:12px 18px;
            border-radius:14px;z-index:99999;flex-direction:column;
            align-items:center;gap:8px;font-size:13px;font-family:sans-serif;
            box-shadow:0 4px 18px rgba(0,0,0,0.6);pointer-events:all;min-width:260px;
        `;
        wrap.innerHTML = `
            <span style="font-size:14px;font-weight:bold;">🧭 Arrow tester — <span id="dev-orient-val">0</span>°</span>
            <input id="dev-orient-slider" type="range" min="0" max="359" value="0"
                   style="width:230px;accent-color:#FFD700;cursor:pointer;">
            <div style="display:flex;gap:8px;">
                <button data-a="0"   style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:#555;color:white;font-size:13px;">↑ N</button>
                <button data-a="90"  style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:#555;color:white;font-size:13px;">→ E</button>
                <button data-a="180" style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:#555;color:white;font-size:13px;">↓ S</button>
                <button data-a="270" style="padding:6px 12px;border-radius:8px;border:none;cursor:pointer;background:#555;color:white;font-size:13px;">← W</button>
            </div>
        `;
        document.body.appendChild(wrap);

        const slider = document.getElementById('dev-orient-slider');
        const valEl  = document.getElementById('dev-orient-val');

        function fire(angle) {
            angle = ((angle % 360) + 360) % 360;
            valEl.textContent = angle;
            slider.value = angle;
            currentHeading = angle;
            applyHeadingToMap(angle);
        }

        slider.addEventListener('input', () => fire(Number(slider.value)));
        wrap.querySelectorAll('button[data-a]').forEach(btn =>
            btn.addEventListener('click', () => fire(Number(btn.dataset.a)))
        );

        // React to devMode toggling — same pattern as keyboard movement
        Object.defineProperty(window, 'devMode', {
            get() { return this._devMode ?? false; },
            set(v) {
                this._devMode = v;
                wrap.style.display = v ? 'flex' : 'none';
                if (v) fire(Number(slider.value)); // show arrow immediately
            },
            configurable: true
        });
    })();
    // ============================================================
    // END DEV ONLY
    // ============================================================

    window.devMode = false;
    window.testArrow = (angle) => { currentHeading = angle; applyHeadingToMap(angle); };
    function enablePirateMovement(map) {
        document.addEventListener('keydown', (event) => {
            if (!window.devMode || !mapLoaded) return;
            let [lat, lng] = userCoords;
            switch (event.key) {
                case 'ArrowUp':    lat += moveStep; break;
                case 'ArrowDown':  lat -= moveStep; break;
                case 'ArrowLeft':  lng -= moveStep; break;
                case 'ArrowRight': lng += moveStep; break;
                default: return;
            }
            userCoords = [lat, lng];
            updatePirateMarker(userCoords, map);
            updateRouteStart(userCoords);
            checkWinCondition();
        });
    }

    document.getElementById('signout-btn').addEventListener('click', () => {
        signOut(getAuth()).then(() => {
            window.location.href = '/dinosaur-card-collector/'; // Redirect to homepage
        }).catch((error) => {
            alert('Sign out failed.');
            console.error(error);
        });
    });

    function showUserInfo() {
        const user = getAuth().currentUser;
        const nameEl = document.getElementById('profile-username');
        const avatarEl = document.getElementById('profile-avatar');
        if (user) {
            const name = user.displayName || user.email || 'Guest Explorer';
            if (nameEl) nameEl.textContent = name;
            if (avatarEl && user.photoURL) {
                avatarEl.src = user.photoURL;
                avatarEl.style.display = 'inline-block';
            }
        } else {
            if (nameEl) nameEl.textContent = 'Guest Explorer';
        }
    }

    showUserInfo();
    initializeCards();
    hideMessage();

    const _iosPermission =
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function';
    showMessage(_iosPermission ? "Tap 🦕 Let's go to start!" : 'Finding your location...');
}