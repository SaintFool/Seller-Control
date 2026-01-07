import { firebaseConfig } from '../../js/firebase-config.js';
import './maps.js';
import { setupAuthListeners, signOut } from './auth.js';
import { showMessage, updateCardState } from './ui.js';
import { recordCheckIn, recordCheckOut } from './firestore.js';
import { calculateDistance } from './utils.js';

// Inicialización de Firebase y referencias comunes
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const logoutButton = document.getElementById('logout-button');
const assignmentsContainer = document.getElementById('assignments-container');

// Logout: limpia estado local y redirige al login
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = '../index.html');
});

// Delegación de eventos para acciones en las tarjetas de asignación.
// Maneja tanto 'check-in' como 'check-out' usando `data-action` en los botones.
assignmentsContainer.addEventListener('click', async (event) => {
    const button = event.target;
    const action = button.dataset.action;

    if (action !== 'check-in' && action !== 'check-out') return;

    // Feedback inmediato en la UI mientras se procesa
    button.disabled = true; button.textContent = 'Procesando...';
    const card = button.closest('.assignment-card');
    const assignmentId = card.dataset.assignmentId;
    const assignment = window.currentAssignments.find(a => a.id === assignmentId);

    if (!assignment) {
        showMessage('Error: Asignación no encontrada.', 'error'); return;
    }

    try {
        // Obtener ubicación actual del dispositivo (permiso requerido)
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
        });

        const userLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const perimeter = assignment.perimeterData;

        // Calcular distancia entre ubicación del usuario y el centro del perímetro
        const distancia = calculateDistance(
            userLocation.latitude, userLocation.longitude,
            perimeter.centro.latitude, perimeter.centro.longitude
        );

        // Validar que el usuario esté dentro del radio definido
        if (distancia > perimeter.radioMetros) {
            throw new Error(`Estás fuera del rango (${distancia.toFixed(0)}m / ${perimeter.radioMetros}m).`);
        }

        // Registrar entrada o salida según la acción
        if (action === 'check-in') {
            await recordCheckIn(db, auth, userLocation, assignment, distancia);
            showMessage('Entrada registrada.', 'success');
        } else {
            await recordCheckOut(db, auth, userLocation, assignment, distancia);
            showMessage('Salida registrada.', 'success');
        }
        updateCardState(assignmentId, action);

    } catch (error) {
        // Mostrar error y restaurar texto del botón
        showMessage(error.message, 'error');
        button.disabled = false;
        button.textContent = action === 'check-in' ? 'Marcar Entrada' : 'Marcar Salida';
    }
});

// Inicializar listeners de auth
setupAuthListeners(auth, db);