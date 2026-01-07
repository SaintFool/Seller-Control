let map, marker, circle;
let currentCenter = null;

// Cargador dinámico del script de Google Maps
let mapPromise = null;
export function loadGoogleMaps() {
    if (mapPromise) return mapPromise;
    mapPromise = new Promise((resolve, reject) => {
        window.initAdminMap = resolve;
        const script = document.createElement('script');
        script.src = `Reemplazar con tu llave de API`;
        script.defer = true;
        document.head.appendChild(script);
        script.onerror = () => reject(new Error('No se pudo cargar el script de Google Maps.'));
    });
    return mapPromise;
}

/**
 * Inicializa un mapa Google Maps en el elemento indicado.
 * - Si se proporciona `initialCenter` y `initialRadius` dibuja inmediatamente
 *   el marcador y el círculo (modo edición).
 * - Si no, permite al usuario hacer click para seleccionar centro y arrastrar
 *   el marcador.
 * @param {string} elementId - ID del div donde va el mapa (ej: 'create-map' o 'edit-map')
 * @param {object|null} initialCenter - (Opcional) Centro inicial {latitude, longitude}
 * @param {number} initialRadius - (Opcional) Radio inicial en metros para el círculo
 * @param {function} onLocationChange - Callback booleano: recibe true si hay centro válido
 */
export function initMap(elementId, initialCenter = null, initialRadius = 100, onLocationChange = () => {}) {
    const mapDiv = document.getElementById(elementId);
    if (!mapDiv) return;

    // Resetear variable del centro para este contexto del mapa
    currentCenter = initialCenter; 
    
    // Configuración por defecto (Lima) si no hay centro inicial
    const centerToUse = initialCenter ? { lat: initialCenter.latitude, lng: initialCenter.longitude } : { lat: -12.046374, lng: -77.042793 };
    const zoomToUse = initialCenter ? 16 : 13;

    map = new google.maps.Map(mapDiv, {
        center: centerToUse,
        zoom: zoomToUse,
        disableDefaultUI: false, // Permitir controles de zoom
    });

    // Si ya hay datos (modo Edición), dibujar marcador y círculo inmediatamente
    if (initialCenter) {
        drawMarkerAndCircle(centerToUse, initialRadius, onLocationChange);
    }

    // Listener de clic en el mapa: permite seleccionar centro en modo crear
    map.addListener('click', (e) => {
        currentCenter = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        drawMarkerAndCircle(currentCenter, initialRadius, onLocationChange);
        onLocationChange(true); // Notificar que hay un centro válido
    });
}

function drawMarkerAndCircle(position, radius, onLocationChange) {
    // Remueve elementos previos para recrear con la nueva posición/radio
    if (marker) marker.setMap(null);
    if (circle) circle.setMap(null);

    // Crea un marcador arrastrable en la posición dada
    marker = new google.maps.Marker({
        position: position,
        map: map,
        draggable: true,
    });

    // Dibuja un círculo con estilo consistente para indicar el perímetro
    circle = new google.maps.Circle({
        strokeColor: "#007BFF",
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: "#007BFF",
        fillOpacity: 0.2,
        map: map,
        center: position,
        radius: radius,
    });

    // Cuando el marcador se mueve, actualizar centro y notificar
    marker.addListener('dragend', () => {
        const newPos = marker.getPosition();
        currentCenter = { lat: newPos.lat(), lng: newPos.lng() };
        circle.setCenter(currentCenter);
        onLocationChange(true);
    });
}

export function updateCircleRadius(radius) {
    // Ajusta el radio del círculo si ya está dibujado
    if (circle) circle.setRadius(radius);
}

export function getPerimeterCenter() {
    // Devuelve la última posición seleccionada o null si no hay
    return currentCenter;
}