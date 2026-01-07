/* Módulo responsable de cargar Google Maps y dibujar mapas por tarjeta.
   Cada tarjeta puede contener su propio mapa independiente; por simplicidad
   creamos una instancia por contenedor `map-<id>`. */
let mapInstances = {}; // Guarda instancias de mapa por elemento
let perimeterCircle, perimeterMarker; 

let mapPromise = null;

function initializeMap(resolve, mapElementId) {
    const mapDiv = document.getElementById(mapElementId);
    if (mapDiv) {
        mapInstances[mapElementId] = new google.maps.Map(mapDiv, {
            center: { lat: -12.046, lng: -77.042 },
            zoom: 12,
            disableDefaultUI: true,
        });
    }
}

export function loadGoogleMaps() {
    if (mapPromise) {
        return mapPromise;
    }
    mapPromise = new Promise((resolve, reject) => {
        window.initMap = () => resolve(); 
        const script = document.createElement('script');
        script.src = `Reemplazar con tu llave de API`;
        script.async = true;
        script.defer = true;
        script.onerror = () => reject(new Error('El script de Google Maps no pudo cargarse.'));
        document.head.appendChild(script);
    });
    return mapPromise;
}

/**
 * Dibuja un perímetro en un mapa específico.
 * Crea una instancia de `google.maps.Map` por cada contenedor para permitir
 * múltiples mapas independientes (uno por asignación).
 * @param {Object} perimeterData - Los datos del perímetro (centro, radio, nombre)
 * @param {string} mapElementId - El ID del div del mapa (ej. "map-xyz123").
 */
export function updateMapWithPerimeter(perimeterData, mapElementId) {
    const mapDiv = document.getElementById(mapElementId);
    if (!mapDiv) return;

    const centerCoords = { lat: perimeterData.centro.latitude, lng: perimeterData.centro.longitude };

    // Creamos una nueva instancia de mapa para este div específico
    const map = new google.maps.Map(mapDiv, {
        center: centerCoords,
        zoom: 16,
        disableDefaultUI: true,
    });

    // Dibujamos el marcador y el círculo en este mapa
    new google.maps.Marker({ position: centerCoords, map: map, title: perimeterData.nombre });
    new google.maps.Circle({
        strokeColor: "#007BFF", strokeOpacity: 0.8, strokeWeight: 2,
        fillColor: "#007BFF", fillOpacity: 0.2,
        map: map, center: centerCoords, radius: perimeterData.radioMetros,
    });
}

/**
 * Resetea el registro de instancias de mapa (útil al cerrar sesión).
 */
export function resetMap() {
    mapInstances = {};
}