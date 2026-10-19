let map, routingControl = null;
let currentPosition = [40.98, 29.15]; // Varsayılan Konum (İstanbul)

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
                console.log("Konum izni alınamadı, varsayılan konum kullanılıyor.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    // Enter tuşu ile arama yapabilme
    document.getElementById('destinationInput').addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            startNavigation();
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

// Global Arama ve Rota Oluşturma
async function startNavigation() {
    const destinationQuery = document.getElementById('destinationInput').value.trim();
    if (!destinationQuery) {
        alert('Lütfen bir şehir, ilçe veya adres yazın!');
        return;
    }

    // Dünya genelinde sorgulama için Nominatim Global API
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationQuery)}&limit=1`;

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'GlobalTruckNav/2.0' }
        });
        const data = await response.json();

        if (!data || data.length === 0) {
            alert('Aradığınız konum dünya genelinde bulunamadı. Lütfen ismi kontrol edip tekrar deneyin.');
            return;
        }

        const destLat = parseFloat(data[0].lat);
        const destLng = parseFloat(data[0].lon);

        if (routingControl) {
            map.removeControl(routingControl);
        }

        // Küresel Rota Oluşturucu
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
                return L.marker(wp.latLng).bindPopup(i === 0 ? "<b>Başlangıç</b>" : `<b>Hedef:</b> ${data[0].display_name}`);
            }
        }).addTo(map);

        // Sesli karşılama
        speak("İyi yolculuklar dileriz.");

        document.getElementById('routeInfo').innerHTML = `<span class="text-blue-400 font-bold">Hedef:</span> ${data[0].display_name.substring(0, 30)}...`;
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
            alert('Aramanız bulundu ancak bu iki konum arasında karayolu rotası oluşturulamadı.');
        });

    } catch (error) {
        console.error(error);
        alert('Sunucuya bağlanırken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.');
    }
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