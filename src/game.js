import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import {showMessage, hideMessage} from "./ui.js";
import {randomPointNear, distanceMeters, getBearingBetween} from "./utils.js";
import {addTreasureMarker} from "./treasureMarker.js";
import {injectPirateCSS, updatePirateMarker, updateArrow, createAnimatedPirateIcon} from "./pirateMarker.js";
import {showCard} from "./showCard.js";

// <!-- Place this just before the closing </body> tag -->
const fullscreenBtn = document.getElementById('fullscreen-btn');

let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

fullscreenBtn.addEventListener('click', () => {
    const doc = document.documentElement;

    // Check if fullscreen is active
    const isFullscreen = document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement;

    if (!isFullscreen) {
        // Request fullscreen (handle various vendor prefixes)
        if (doc.requestFullscreen) {
            doc.requestFullscreen();
        } else if (doc.webkitRequestFullscreen) { // Safari
            doc.webkitRequestFullscreen();
        } else if (doc.mozRequestFullScreen) { // Firefox
            doc.mozRequestFullScreen();
        } else if (doc.msRequestFullscreen) { // IE/Edge
            doc.msRequestFullscreen();
        } else {
            alert('Fullscreen API is not supported on this browser.');
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
});

const MAP_STYLE = "https://api.maptiler.com/maps/0197dc02-f415-76e6-a860-fc5b1805cd22/style.json?key=4XkkKpwhltbHeFPyQbNh";
const DEFAULT_ZOOM = 15;

let map;
let userCoords;
let treasureCoords;

let win = false;
let currentHeading = null;
const marker = document.querySelector('.maplibregl-user-location-dot');
if (marker) marker.style.display = 'none';


function checkWinCondition() {
    if (!userCoords || !treasureCoords || win) return;
    const dist = distanceMeters(userCoords, treasureCoords);
    if (dist <= 30) {
        showMessage("🏴☠️ You are very close. Don't give up");
    }
    if (dist <= 15) {
        win = true;
        showMessage("You found it. Great job.");
        showCard();
    }
}

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
        updateArrow(currentHeading);
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

function drawRoute(userCoords, treasureCoords) {
    // Remove existing path if present
    if (map.getSource('user-to-treasure')) {
        if (map.getLayer('user-to-treasure-line')) {
            map.removeLayer('user-to-treasure-line');
        }
        map.removeSource('user-to-treasure');
    }
    fetchRoute(userCoords, treasureCoords).then(geometry => {
        map.addSource('user-to-treasure', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: geometry
            }
        });
        map.addLayer({
            id: 'user-to-treasure-line',
            type: 'line',
            source: 'user-to-treasure',
            layout: {},
            paint: {
                'line-color': '#FFD700',
                'line-width': 4,
                'line-dasharray': [2, 2]
            }
        });
    }).catch(() => {
        if (userCoords && treasureCoords) {

            map.addSource('user-to-treasure', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [
                            [userCoords[1], userCoords[0]],
                            [treasureCoords[1], treasureCoords[0]]
                        ]
                    }
                }
            });
            map.addLayer({
                id: 'user-to-treasure-line',
                type: 'line',
                source: 'user-to-treasure',
                layout: {},
                paint: {
                    'line-color': '#FFD700',
                    'line-width': 4,
                    'line-dasharray': [2, 2]
                }
            });
        }
    });
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
            injectPirateCSS();
            updatePirateMarker(userCoords, map);
            const TREASURE_DISTANCE_RADIUS = 150;
            treasureCoords = randomPointNear(userCoords, TREASURE_DISTANCE_RADIUS);
            addTreasureMarker(treasureCoords, map);

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
        updatePirateMarker(userCoords, map);
        // updateArrow(currentHeading);
        drawRoute(userCoords, treasureCoords);
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
        timeout: 20000,
        maximumAge: 0
    });
    navigator.geolocation.watchPosition(pos => {
        onPosition(pos);
        checkWinCondition();
    }, onError, {enableHighAccuracy: true, maximumAge: 2000, timeout: 7000});
}

hideMessage();
showMessage('Finding your location...');
window.onload = startTracking;