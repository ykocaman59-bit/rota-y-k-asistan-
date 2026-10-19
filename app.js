let map, routingControl = null;
let currentPosition = [40.98, 29.15]; // Varsayılan Konum (İstanbul)
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    // Harita İlklendirme
    map = L.map('map', { zoomControl: true }).setView(currentPosition, 12);

    // OpenStreetMap Küresel Katmanı
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Kullanıcı Konumunu Al
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                currentPosition = [position.coords.latitude, position.coords.longitude];
                map.setView(currentPosition, 13);
                L.marker(currentPosition).addTo(map).bindPopup("<b>Mevcut Konumunuz</b>").openPopup();
            },
            error => {
                console.log("Konum alınamadı, varsayılan konum kullanılıyor.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    // Yandex Tarzı Anlık Arama Dinleyicisi (Autocomplete)
    const inputField = document.getElementById('destinationInput');
    inputField.addEventListener('input', function() {
        const query = this.value.trim();
        clearTimeout(searchTimeout);

        if (query.length < 3) {
            hideSuggestions();
            return;
        }

        // 300ms gecikme ile sunucuya yük binmesini önle
        searchTimeout = setTimeout(() => {
            fetchSuggestions(query);
        }, 300);
    });

    // Dışarı tıklandığında önerileri kapat
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#destinationInput') && !e.target.closest('#suggestions')) {
            hideSuggestions();
        }
    });
});

// Sesli Asistan
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
    }
}

// Anlık Önerileri Getir (Autocomplete)
async function fetchSuggestions(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
    
    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'GlobalTruckNav/3.0' }
        });
        const data = await response.json();

        const box = document.getElementById('suggestions');
        if (!data || data.length === 0) {
            box.innerHTML = '<div class="p-2.5 text-xs text-slate-400">Sonuç bulunamadı</div>';
            box.classList.remove('hidden');
            return;
        }

        let html = '';
        data.forEach(item => {
            html += `<div onclick="selectLocation(${item.lat}, ${item.lon}, '${item.display_name.replace(/'/g, "")}')" class="p-2.5 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer transition truncate">${item.display_name}</div>`;
        });

        box.innerHTML = html;
        box.classList.remove('hidden');
    } catch (e) {
        console.log("Öneri alınamadı:", e);
    }
}

function hideSuggestions() {
    document.getElementById('suggestions').classList.add('hidden');
}

// Listeden bir adres seçildiğinde
function selectLocation(lat, lon, displayName) {
    document.getElementById('destinationInput').value = displayName;
    hideSuggestions();
    createRoute(parseFloat(lat), parseFloat(lon), displayName);
}

// Doğrudan "Git" butonuna basıldığında
function startNavigationDirect() {
    const query = document.getElementById('destinationInput').value.trim();
    if (!query) {
        alert('Lütfen bir adres veya şehir girin!');
        return;
    }
    hideSuggestions();
    searchAndRoute(query);
}

// Metin ile arayıp rota çiz
async function searchAndRoute(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'GlobalTruckNav/3.0' }
        });
        const data = await response.json();

        if (!data || data.length === 0) {
            alert('Aradığınız konum bulunamadı.');
            return;
        }

        createRoute(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
    } catch (error) {
        console.error(error);
        alert('Bağlantı hatası oluştu. Lütfen internetinizi kontrol edin.');
    }
}

// Ortak Rota Oluşturucu
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

    routingControl.on('routingerror', function(e) {
        alert('Bu iki konum arasında karayolu rotası bulunamadı.');
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