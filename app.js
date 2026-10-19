let map, routingControl = null;
let currentPosition = [40.98, 29.15];

const popularLocations = [
    { name: "Eskişehir, Merkez", lat: 39.7767, lon: 30.5206 },
    { name: "Ankara, Kızılay", lat: 39.9208, lon: 32.8541 },
    { name: "İstanbul, Kadıköy", lat: 40.9901, lon: 29.0294 },
    { name: "İstanbul, Sultanbeyli", lat: 40.9667, lon: 29.2667 },
    { name: "Bursa, Osmangazi", lat: 40.1828, lon: 29.0665 },
    { name: "İzmir, Konak", lat: 38.4192, lon: 27.1287 },
    { name: "Antalya, Muratpaşa", lat: 36.8841, lon: 30.7056 },
    { name: "Kocaeli, İzmit", lat: 40.7654, lon: 29.9408 },
    { name: "Sakarya, Adapazarı", lat: 40.7736, lon: 30.4025 },
    { name: "Berlin, Almanya", lat: 52.5200, lon: 13.4050 },
    { name: "Londra, İngiltere", lat: 51.5074, lon: -0.1278 }
];

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map', { zoomControl: true }).setView(currentPosition, 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                currentPosition = [position.coords.latitude, position.coords.longitude];
                map.setView(currentPosition, 13);
                L.marker(currentPosition).addTo(map).bindPopup("<b>Mevcut Konumunuz</b>").openPopup();
            },
            error => { console.log("Konum alınamadı."); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    const inputField = document.getElementById('destinationInput');
    inputField.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        const box = document.getElementById('suggestions');

        if (query.length < 2) {
            box.classList.add('hidden');
            return;
        }

        const filtered = popularLocations.filter(loc => loc.name.toLowerCase().includes(query));

        if (filtered.length === 0) {
            box.innerHTML = '<div class="p-2.5 text-xs text-slate-400">Öneri bulunamadı (Git tuşuna basabilirsiniz)</div>';
            box.classList.remove('hidden');
            return;
        }

        let html = '';
        filtered.forEach(item => {
            html += `<div onclick="selectLocation(${item.lat}, ${item.lon}, '${item.name}')" class="p-2.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer transition truncate">${item.name}</div>`;
        });

        box.innerHTML = html;
        box.classList.remove('hidden');
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('#destinationInput') && !e.target.closest('#suggestions')) {
            document.getElementById('suggestions').classList.add('hidden');
        }
    });
});

function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    }
}

function selectLocation(lat, lon, displayName) {
    document.getElementById('destinationInput').value = displayName;
    document.getElementById('suggestions').classList.add('hidden');
    createRoute(lat, lon, displayName);
}

function startNavigationDirect() {
    const query = document.getElementById('destinationInput').value.trim();
    if (!query) {
        alert('Lütfen bir şehir veya adres girin!');
        return;
    }
    document.getElementById('suggestions').classList.add('hidden');

    const found = popularLocations.find(loc => loc.name.toLowerCase().includes(query.toLowerCase()));
    if (found) {
        createRoute(found.lat, found.lon, found.name);
    } else {
        searchGlobal(query);
    }
}

async function searchGlobal(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data || data.length === 0) {
            alert('Konum bulunamadı.');
            return;
        }
        createRoute(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
    } catch (e) {
        alert('Bağlantı hatası.');
    }
}

function createRoute(destLat, destLng, displayName) {
    if (routingControl) {
        map.removeControl(routingControl);
    }

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(currentPosition[0], currentPosition[1]),
            L.latLng(destLat, destLng)
        ],
        routeWhileDragging: false,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        language: 'tr',
        createMarker: function(i, wp, n) {
            return L.marker(wp.latLng).bindPopup(i === 0 ? "<b>Başlangıç</b>" : `<b>Hedef:</b> ${displayName}`);
        }
    }).addTo(map);

    speak("İyi yolculuklar dileriz.");

    document.getElementById('routeInfo').innerHTML = `<span class="text-blue-400 font-bold">Hedef:</span> ${displayName.substring(0, 30)}...`;
    document.getElementById('endTripBtn').classList.remove('hidden');

    routingControl.on('routesfound', function(e) {
        const summary = e.routes[0].summary;
        const km = (summary.totalDistance / 1000).toFixed(1);
        const dakika = Math.round(summary.totalTime / 60);
        const saat = Math.floor(dakika / 60);
        const kalanDakika = dakika % 60;

        let sureMetni = saat > 0 ? `${saat} sa ${kalanDakika} dk` : `${dakika} dk`;
        document.getElementById('routeInfo').innerHTML = `Mesafe: <b class="text-emerald-400">${km} km</b> | Süre: <b class="text-blue-400">${sureMetni}</b>`;
    });
}

function stopNavigation() {
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    speak("Yolculuğunuz sona ermiştir.");
    document.getElementById('routeInfo').innerHTML = '<span>Yolculuk sonlandırıldı. Yeni hedef seçin.</span>';
    document.getElementById('endTripBtn').classList.add('hidden');
    document.getElementById('destinationInput').value = '';
}