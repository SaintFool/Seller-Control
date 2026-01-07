// Elementos principales de la UI de la app móvil (vendedor)
const appContainer = document.getElementById('app-container');
const userNameDisplay = document.getElementById('user-name-display');
const assignmentsContainer = document.getElementById('assignments-container');

/**
 * Muestra la pantalla principal de la aplicación.
 * (Simplificada: ya no necesitamos ocultar login-container porque no existe)
 */
export function showAppScreen() {
    if (appContainer) {
        appContainer.classList.remove('hidden');
    }
}

/**
 * Actualiza el nombre del usuario en la cabecera.
 * @param {string} userName
 */
export function updateUserInfo(userName) {
    if (userNameDisplay) {
        userNameDisplay.textContent = userName || 'Usuario';
    }
}

/**
 * Renderiza tarjetas de asignación recibidas desde `findTodaysAssignments`.
 * Cada tarjeta contiene:
 * - Título con nombre del perímetro
 * - Contenedor de mapa (map-<id>)
 * - Botones para marcar entrada/salida según estado
 *
 * @param {Array<Object>} assignments
 */
export function renderAssignments(assignments) {
    if (!assignmentsContainer) return;

    if (assignments.length === 0) {
        assignmentsContainer.innerHTML = '<div style="padding: 20px; color: #666;">No tienes asignaciones para el día de hoy.</div>';
        return;
    }

    const assignmentsHTML = assignments.map(asig => {
        // Formato de hora
        let horaAsignada = '---';
        if (asig.fecha) {
            horaAsignada = asig.fecha.toDate().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        }

        const isCheckInDone = !!asig.checkInTime;
        const isCheckOutDone = !!asig.checkOutTime;

        // Lógica de estado de botones
        const checkInButtonState = isCheckInDone ? 'disabled' : '';
        const checkOutButtonState = !isCheckInDone || isCheckOutDone ? 'disabled' : '';
        
        const checkInButtonClass = isCheckInDone ? 'success' : '';
        const checkOutButtonClass = isCheckOutDone ? 'success' : '';
        
        const cardCompletedClass = isCheckInDone && isCheckOutDone ? 'completed' : '';

        return `
            <div class="assignment-card ${cardCompletedClass}" data-assignment-id="${asig.id}" data-perimeter-id="${asig.perimetroID}">
                <h3>${asig.perimeterData ? asig.perimeterData.nombre : 'Perímetro'}</h3>
                <p>Hora de inicio asignada: <strong>${horaAsignada}</strong></p>
                
                <!-- Contenedor del mapa -->
                <div id="map-${asig.id}" class="map-placeholder" style="height: 200px; background: #eee;"></div>
                
                <div class="button-group">
                    <button class="check-in-btn ${checkInButtonClass}" data-action="check-in" ${checkInButtonState}>
                        ${isCheckInDone ? 'Entrada Registrada' : 'Marcar Entrada'}
                    </button>
                    <button class="check-out-btn ${checkOutButtonClass}" data-action="check-out" ${checkOutButtonState}>
                        ${isCheckOutDone ? 'Salida Registrada' : 'Marcar Salida'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    assignmentsContainer.innerHTML = assignmentsHTML;
}

/**
 * Actualiza el estado visual de una tarjeta tras marcar entrada/salida.
 * - `check-in`: marca botón de entrada como registrado y habilita salida.
 * - `check-out`: marca salida registrada y marca tarjeta como completada.
 *
 * @param {string} assignmentId
 * @param {'check-in'|'check-out'} action
 */
export function updateCardState(assignmentId, action) {
    const card = document.querySelector(`.assignment-card[data-assignment-id="${assignmentId}"]`);
    if (!card) return;

    if (action === 'check-in') {
        const btnIn = card.querySelector('.check-in-btn');
        const btnOut = card.querySelector('.check-out-btn');
        if(btnIn) {
            btnIn.textContent = 'Entrada Registrada';
            btnIn.disabled = true;
            btnIn.classList.add('success');
        }
        if(btnOut) {
            btnOut.disabled = false; 
        }
    } else if (action === 'check-out') {
        const btnOut = card.querySelector('.check-out-btn');
        if(btnOut) {
            btnOut.textContent = 'Salida Registrada';
            btnOut.disabled = true;
            btnOut.classList.add('success');
        }
        card.classList.add('completed'); 
    }
}

/**
 * Muestra un mensaje simple al usuario. Actualmente usa `alert`.
 * @param {string} text
 * @param {string} [type] - 'error' para prefijar con ERROR
 */
export function showMessage(text, type) {
    alert(`${type === 'error' ? 'ERROR' : 'ÉXITO'}: ${text}`);
}