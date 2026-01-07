import { showAppScreen, updateUserInfo, renderAssignments, showMessage } from './ui.js';
import { findTodaysAssignments } from './firestore.js';
import { loadGoogleMaps, resetMap, updateMapWithPerimeter } from './maps.js';

window.currentAssignments = [];

/**
 * Cierra la sesión del usuario y limpia estado temporal (mapas y asignaciones).
 * @param {firebase.auth.Auth} auth - instancia de Firebase Auth
 * @returns {Promise} Promesa devuelta por `auth.signOut()`
 */
export function signOut(auth) {
    window.currentAssignments = [];
    resetMap();
    return auth.signOut();
}

/**
 * Registra listeners de autenticación y, al iniciar sesión:
 * - Muestra la UI de la app
 * - Carga datos del usuario desde `users`
 * - Inicializa Google Maps (carga asíncrona del script)
 * - Busca las asignaciones del día y renderiza tarjetas + mapas
 *
 * @param {firebase.auth.Auth} auth
 * @param {firebase.firestore.Firestore} db
 */
export function setupAuthListeners(auth, db) {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Usuario autenticado: preparar la pantalla de la app
            showAppScreen();
            try {
                // Intentar leer perfil del usuario en 'users'
                const userDoc = await db.collection('users').doc(user.uid).get();

                if (!userDoc.exists) {
                    console.error("Usuario autenticado no existe en la BD 'users'");
                    showMessage("Error de cuenta. Contacta al administrador.", "error");
                    return;
                }

                const userData = userDoc.data();
                const userName = userData.nombre || user.email;
                updateUserInfo(userName);

                // Asegurar que Google Maps esté cargado antes de dibujar mapas
                await loadGoogleMaps();

                // Buscar asignaciones del día para este vendedor (por UID y DNI en users)
                const assignments = await findTodaysAssignments(db, user.uid, userData);
                window.currentAssignments = assignments;
                
                // Renderizar tarjetas y mapear perímetros individuales
                renderAssignments(assignments);
                assignments.forEach(asig => {
                    if (asig.perimeterData) updateMapWithPerimeter(asig.perimeterData, `map-${asig.id}`);
                });

            } catch (error) {
                console.error("Error cargando datos:", error);
                showMessage("Error cargando asignaciones.", "error");
            }
        } else {
            // No autenticado: redirigir al login
            window.location.href = '../index.html';
        }
    });
}