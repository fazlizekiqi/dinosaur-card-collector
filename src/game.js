import 'maplibre-gl/dist/maplibre-gl.css';
import maplibregl from 'maplibre-gl';
import {showMessage, hideMessage} from "./ui.js";
import {randomPointNear, distanceMeters, getBearingBetween} from "./utils.js";
import {addTreasureMarker} from "./treasureMarker.js";
import {injectPirateCSS, updatePirateMarker, updateArrow, createAnimatedPirateIcon} from "./pirateMarker.js";
import {showCard} from "./showCard.js";

// <!-- Place this just before the closing </body> tag -->
const fullscreenBtn = document.getElementById('fullscreen-btn');

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
    if(dist <= 30){
        showMessage("🏴☠️ You are very close. Don't give up");
    }
    if (dist <= 15) {
        win = true;
        showMessage("You found it. Great job.");
        showCard();
    }
}

function handleOrientation(event) {
    let heading;
    if (typeof event.webkitCompassHeading !== "undefined") {
        heading = event.webkitCompassHeading;
    } else if (typeof event.alpha !== "undefined") {
        heading = 360 - event.alpha;
    }
    if (heading !== undefined && heading !== null) {
        if (heading < 0) heading += 360;
        currentHeading = heading;
        updateArrow(userCoords, treasureCoords, currentHeading);
    }
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
                    .catch(() => {});
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
        if(userCoords && treasureCoords) {

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

            map.flyTo({
                center: [longitude, latitude],
                zoom: DEFAULT_ZOOM + 2,
                speed: 1.2,
                curve: 1.5,
                essential: true
            });
            map.once('moveend', () => {
                map.setMinZoom(DEFAULT_ZOOM + 2);
                map.setMaxZoom(DEFAULT_ZOOM + 2);
            });
            setupOrientationListener();
            updateArrow(userCoords, treasureCoords, currentHeading);
            drawRoute(userCoords, treasureCoords);
        });
    } else {
        updatePirateMarker(userCoords, map);
        updateArrow(userCoords, treasureCoords, currentHeading);
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
    showMessage('Go get that treasure.');
    navigator.geolocation.getCurrentPosition(onPosition, onError, {enableHighAccuracy: true, timeout: 20000, maximumAge:0});
    navigator.geolocation.watchPosition(pos => {
        onPosition(pos);
        checkWinCondition();
    }, onError, {enableHighAccuracy: true, maximumAge: 2000, timeout: 7000});
}

hideMessage();
showMessage('Finding your location...');
window.onload = startTracking;