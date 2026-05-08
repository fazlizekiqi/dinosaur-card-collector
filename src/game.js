import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import { showMessage, hideMessage } from './ui.js';
import { showCard, getNextCard, initializeCards } from './showCard.js';
import { addTreasureMarker } from './treasureMarker.js';
import {updatePirateMarker, injectPirateCSS, updateArrow, resetPirateMarker} from './pirateMarker.js';
import { distanceMeters, randomPointNear, getBearingBetween } from './utils.js';
import { getAuth, signOut } from 'firebase/auth';



export function initGame(){
    resetPirateMarker();

    // Read user-configured radius from settings on home screen (default 150m)
    const TREASURE_DISTANCE_RADIUS = parseInt(localStorage.getItem('eggRadius') || '150', 10);

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const dinoModal = document.getElementById('dino-collector-modal');
    const closeDinoModalBtn = document.getElementById('close-dino-modal-btn');

    fullscreenBtn.addEventListener('click', () => {
        dinoModal.classList.add('show');
    });

    closeDinoModalBtn.addEventListener('click', () => {
        dinoModal.classList.remove('show');
    });


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

    const MAP_STYLE = "https://api.maptiler.com/maps/0197dc02-f415-76e6-a860-fc5b1805cd22/style.json?key=4XkkKpwhltbHeFPyQbNh";
    const DEFAULT_ZOOM = 15;

    let map;
    let mapLoaded = false;          // true only after map 'load' fires
    let userCoords;
    let treasureCoords;

    let win = false;
    let currentHeading = null;
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

    let arrowFollowsDevice = true;

    function handleOrientation(event) {
        if (!arrowFollowsDevice) return;
        let heading;
        if (typeof event.webkitCompassHeading !== "undefined") {
            heading = event.webkitCompassHeading;
        } else if (typeof event.alpha !== "undefined") {
            heading = 360 - event.alpha;
        }
        if (heading !== undefined && heading !== null) {
            if (heading < 0) heading += 360;
            currentHeading = heading;
            // Compute direction to treasure relative to device facing direction
            if (userCoords && treasureCoords) {
                const bearing = getBearingBetween(userCoords, treasureCoords);
                const relativeAngle = (bearing - heading + 360) % 360;
                updateArrow(relativeAngle);
            } else {
                updateArrow(0);
            }
        }
    }


    function onMapRotate() {
        // If the map is rotated away from north, stop arrow following device
        if (Math.abs(map.getBearing()) > 1) {
            arrowFollowsDevice = false;
        } else {
            arrowFollowsDevice = true;
        }
    }


// Optionally, provide a button to reset map rotation and re-enable arrow
    function resetMapRotation() {
        map.rotateTo(0, {duration: 500});
        arrowFollowsDevice = true;
    }

    function setupOrientationListener() {
        if (window.DeviceOrientationEvent) {
            function requestOrientationPermission() {
                if (
                    typeof DeviceOrientationEvent.requestPermission === "function"
                ) {
                    DeviceOrientationEvent.requestPermission()
                        .then((response) => {
                            if (response == "granted") {
                                window.addEventListener("deviceorientation", handleOrientation, true);
                            }
                        })
                        .catch(() => {
                        });
                } else {
                    window.addEventListener("deviceorientation", handleOrientation, true);
                }
            }

            window.addEventListener("click", requestOrientationPermission, {once: true});
        }
    }

    async function fetchRoute(start, end) {
        const apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjhjYjhhOGY2ZGQ5MDRmMDA5MWJhYTZiODRhNDQyYzgwIiwiaCI6Im11cm11cjY0In0=';
        const url = `https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${start[1]},${start[0]}&end=${end[1]},${end[0]}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.features[0].geometry;
    }

    // ── Route drawing — single stable source, updated with setData ──
    const ROUTE_SOURCE = 'route';
    const ROUTE_LAYER  = 'route-line';
    let routeFetchController = null;
    let fetchedRouteCoords   = null;   // the road-following coords from the last successful fetch
    let routeFetchedFromCoords = null; // the userCoords at the time of the last fetch

    const REFETCH_DISTANCE_M = 40;     // re-fetch the walking route after moving this far

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
    }

    function generateRandomTreasure() {
        treasureCoords = randomPointNear(userCoords, TREASURE_DISTANCE_RADIUS);
        addTreasureMarker(treasureCoords, map);
        drawRoute(userCoords, treasureCoords);
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
                        clouds.forEach(cloud => {
                            cloud.style.transform = 'translate(0,0)';
                        });
                    }, 200);
                });

                setupOrientationListener();
                // updateArrow(currentHeading);
                drawRoute(userCoords, treasureCoords);
                map.on('rotate', onMapRotate);
                map.on('dragrotate', onMapRotate);
            });
        } else {
            if (!mapLoaded) return;   // map exists but style not ready yet — load callback handles first render
            updatePirateMarker(userCoords, map);
            updateRouteStart(userCoords);
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


    window.devMode = false;
    const moveStep = 0.00025;
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

// Call showUserInfo on load
    showUserInfo();

    initializeCards()
    hideMessage();
    showMessage('Finding your location...');
    startTracking();
}