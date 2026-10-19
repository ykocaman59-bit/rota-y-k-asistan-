let map, routingControl = null;
let currentPosition = [40.98, 29.15]; // Varsayılan Başlangıç (İstanbul)

document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView(currentPosition, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Kullanıcının gerçek konumunu al
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            currentPosition = [position.coords.latitude, position.coords.longitude];
            map.setView(currentPosition, 14);
            L.marker(currentPosition).addTo(map).bindPopup("Buradasınız").openPopup();
        });
    }
});

// Sesli Asistan Fonksiyonu
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

// Hedef Adresi Koordinata Çevir ve Rota Çiz
async function startNavigation() {
    const destinationQuery = document.getElementById('destinationInput').value;
    if (!destinationQuery) {
        alert('Lütfen bir hedef girin!');
        return;
    }

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationQuery)}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.length === 0) {
            alert('Aradığınız konum bulunamadı. Lütfen daha detaylı yazın.');
            return;
        }

        const destLat = parseFloat(data[0].lat);
        const destLng = parseFloat(data[0].lon);

        if (routingControl) {
            map.removeControl(routingControl);
        }

        // Rota Oluşturucu
        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(currentPosition[0], currentPosition[1]),
                L.latLng(destLat, destLng)
            ],
            routeWhileDragging: false,
            language: 'tr',
            createMarker: function(i, wp, n) {
                return L.marker(wp.latLng).bindPopup(i === 0 ? "Başlangıç" : "Hedef");
            }
        }).addTo(map);

        // Sesli Karşılama ve Arayüz Güncellemesi
        speak("İyi yolculuklar dileriz.");
        document.getElementById('routeInfo').innerHTML = `<span class="text-emerald-400 font-bold">Rota:</span> ${data[0].display_name.substring(0, 35)}...`;
        document.getElementById('endTripBtn').classList.remove('hidden');

        routingControl.on('routesfound', function(e) {
            const summary = e.routes[0].summary;
            const km = (summary.totalDistance / 1000).toFixed(1);
            const dakika = Math.round(summary.totalTime / 60);
            document.getElementById('routeInfo').innerHTML = `Mesafe: <b>${km} km</b> | Süre: <b>${dakika} dk</b>`;
        });

    } catch (error) {
        console.error(error);
        alert('Rota oluşturulurken bir hata oluştu.');
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