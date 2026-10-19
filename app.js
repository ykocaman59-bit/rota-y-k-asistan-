// Default map center (Istanbul coordinates)
const defaultLat = 40.98, defaultLng = 29.15;
let map, currentMarkers = [], tempCoords = null;

// Initial predefined markers (sample truck routes and restrictions)
const initialData = [
    { id: 1, type: 'danger', title: 'Alçak Alt Geçit (3.80m)', description: 'Yüksek dorse araçlar dikkat! Alternatif yan yolu kullanın.', lat: 40.982, lng: 29.145 },
    { id: 2, type: 'parking', title: 'Güvenli Kamyon/TIR Parkı', description: '7/24 Güvenlik, Duş, Mescit ve Restoran mevcut.', lat: 40.975, lng: 29.160 },
    { id: 3, type: 'info', title: 'Şehir İçi Tonaj Yasağı Saatleri', description: '06:00 - 10:00 ve 16:00 - 20:00 saatleri arası ağır vasıta girişi yasaktır.', lat: 40.990, lng: 29.130 }
];

// Load markers from LocalStorage or use defaults
function getStoredMarkers() {
    const data = localStorage.getItem('rota_markers');
    return data ? JSON.parse(data) : initialData;
}

function saveStoredMarkers(markers) {
    localStorage.setItem('rota_markers', JSON.stringify(markers));
}

// Initialize Leaflet Map
document.addEventListener('DOMContentLoaded', () => {
    map = L.map('map').setView([defaultLat, defaultLng], 12);

    // OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Render Markers
    loadMarkersOnMap('all');

    // Click on map to pick coordinates for modal
    map.on('click', (e) => {
        tempCoords = e.latlng;
        document.getElementById('coords').value = `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
    });

    // Check Online/Offline status
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
});

function updateOnlineStatus() {
    const statusEl = document.getElementById('offline-status');
    if (navigator.onLine) {
        statusEl.textContent = 'Çevrimiçi';
        statusEl.className = 'text-xs bg-emerald-500 text-gray-900 font-semibold px-2.5 py-1 rounded-full shadow';
    } else {
        statusEl.textContent = 'Çevrimdışı (Çevrimdışı Mod)';
        statusEl.className = 'text-xs bg-amber-500 text-gray-900 font-semibold px-2.5 py-1 rounded-full shadow';
    }
}

// Render markers to map with custom icons/colors
function loadMarkersOnMap(filterType = 'all') {
    // Clear existing layer markers
    currentMarkers.forEach(m => map.removeLayer(m));
    currentMarkers = [];

    const markers = getStoredMarkers();

    markers.forEach(item => {
        if (filterType !== 'all' && item.type !== filterType) return;

        let badgeColor = item.type === 'danger' ? '#ef4444' : (item.type === 'parking' ? '#10b981' : '#3b82f6');
        let iconSymbol = item.type === 'danger' ? '⚠️' : (item.type === 'parking' ? '🅿️' : 'ℹ️');

        const customIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${badgeColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; border: 2px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">${iconSymbol}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });

        const marker = L.marker([item.lat, item.lng], { icon: customIcon }).addTo(map);
        marker.bindPopup(`
            <div style="font-family: sans-serif; color: #1e293b; max-width: 200px;">
                <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${item.title}</h3>
                <p style="font-size: 12px; margin: 0; color: #475569;">${item.description}</p>
                <div style="margin-top: 8px; font-size: 10px; color: #94a3b8;">Sürücü Bildirimi</div>
            </div>
        `);

        currentMarkers.push(marker);
    });
}

function filterMarkers(type) {
    loadMarkersOnMap(type);
}

function openAddModal() {
    document.getElementById('addModal').classList.remove('hidden');
}

function closeAddModal() {
    document.getElementById('addModal').classList.add('hidden');
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords;
            tempCoords = { lat: latitude, lng: longitude };
            document.getElementById('coords').value = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
            map.setView([latitude, longitude], 14);
        }, () => {
            alert('Konum erişimi alınamadı.');
        });
    } else {
        alert('Cihazınız konum özelliğini desteklemiyor.');
    }
}

function saveNewMarker(e) {
    e.preventDefault();
    if (!tempCoords) {
        alert('Lütfen harita üzerinden bir noktaya tıklayın veya "Konumumu Al" butonuna basın.');
        return;
    }

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const type = document.getElementById('type').value;

    const markers = getStoredMarkers();
    const newMarker = {
        id: Date.now(),
        type,
        title,
        description,
        lat: tempCoords.lat,
        lng: tempCoords.lng
    };

    markers.push(newMarker);
    saveStoredMarkers(markers);
    loadMarkersOnMap('all');

    // Reset form & close modal
    document.getElementById('markerForm').reset();
    tempCoords = null;
    closeAddModal();
}