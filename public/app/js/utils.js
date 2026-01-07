// js/utils.js

/**
 * Calcula la distancia en metros entre dos coordenadas geográficas usando
 * la fórmula de Haversine. Devuelve la distancia aproximada en metros.
 *
 * @param {number} lat1 Latitud del punto 1 (grados)
 * @param {number} lon1 Longitud del punto 1 (grados)
 * @param {number} lat2 Latitud del punto 2 (grados)
 * @param {number} lon2 Longitud del punto 2 (grados)
 * @returns {number} Distancia en metros
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Radio promedio de la Tierra en metros
    const toRad = v => v * Math.PI / 180;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const deltaPhi = toRad(lat2 - lat1);
    const deltaLambda = toRad(lon2 - lon1);
    const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}