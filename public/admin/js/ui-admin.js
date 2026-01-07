// Elementos DOM principales usados por el panel de administración
const loginContainer = document.getElementById('login-container');
const adminPanel = document.getElementById('admin-panel');
const adminNameDisplay = document.getElementById('admin-name-display');
const perimetersListContainer = document.getElementById('perimeters-list');

/**
 * Muestra la pantalla de login y oculta el panel de administración.
 * Usado cuando no hay usuario autenticado o al cerrar sesión.
 */
export function showLoginScreen() {
    loginContainer.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

/**
 * Muestra el panel de administración y oculta la pantalla de login.
 * Llamar después de autenticación exitosa.
 */
export function showAdminPanel() {
    loginContainer.classList.add('hidden');
    adminPanel.classList.remove('hidden');
}

/**
 * Actualiza la información visible del administrador (correo o nombre).
 * @param {string} adminName - Texto a mostrar en la cabecera del panel
 */
export function updateAdminInfo(adminName) {
    adminNameDisplay.textContent = adminName;
}

/*Eliminar Perímetros*/
export function renderPerimeters(perimeters) {
    if (perimeters.length === 0) {
        perimetersListContainer.innerHTML = '<p>No se encontraron resultados.</p>';
        return;
    }

    perimetersListContainer.innerHTML = perimeters.map(p => `
        <div class="perimeter-item" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: white;">
            <div>
                <h4 style="margin:0 0 5px 0;">${p.nombre}</h4>
                <p style="margin:0; font-size: 14px; color: #666;">ID: ${p.id} | ${p.distrito}</p>
            </div>
            <div class="action-buttons">
                <button class="btn-edit-perimeter" data-id="${p.id}">Editar</button>
                <button class="btn-delete-perimeter" data-id="${p.id}">Eliminar</button>
            </div>
        </div>
    `).join('');
}

/**
 * Renderiza la lista de perímetros en la vista de edición.
 * Cada elemento incluye un botón para iniciar la edición del perímetro.
 * @param {Array<Object>} perimeters - Lista de perímetros (de Firestore)
 */
export function renderPerimeters(perimeters) {
    if (perimeters.length === 0) {
        perimetersListContainer.innerHTML = '<p>No se encontraron resultados.</p>';
        return;
    }

    perimetersListContainer.innerHTML = perimeters.map(p => `
        <div class="perimeter-item" style="display: flex; justify-content: space-between; align-items: center; border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: white;">
            <div>
                <h4 style="margin:0 0 5px 0;">${p.nombre}</h4>
                <p style="margin:0; font-size: 14px; color: #666;">ID: ${p.id} | ${p.distrito}</p>
            </div>
            <button class="btn-edit-perimeter" data-id="${p.id}" style="padding: 8px 15px; background-color: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Editar
            </button>
        </div>
    `).join('');
}

/**
 * Muestra una sección del panel y actualiza el estado activo del nav.
 * - Oculta todas las secciones `.content-section`
 * - Muestra solo la sección con `sectionIdToShow`
 * - Marca el botón de navegación correspondiente como `active`
 * @param {string} sectionIdToShow - ID del contenedor a mostrar
 */
export function showSection(sectionIdToShow) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const sectionToShow = document.getElementById(sectionIdToShow);
    if (sectionToShow) {
        sectionToShow.classList.remove('hidden');
    }

    const activeBtn = document.querySelector(`.nav-btn[data-section="${sectionIdToShow}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

/**
 * Muestra un mensaje al usuario. Actualmente usa `alert` para simplicidad,
 * pero puede reemplazarse por un sistema de notificaciones más elegante.
 * @param {string} message - Texto a mostrar
 * @param {string} [type='info'] - Tipo de mensaje ('info', 'success', 'error')
 */
export function showMessage(message, type = 'info') {
    alert(`[${type.toUpperCase()}] ${message}`);
}

// Selectores y contenedores para formularios y listas de asignaciones
const sellerSelect = document.getElementById('seller-select');
const perimeterSelect = document.getElementById('perimeter-select');
const assignmentsListContainer = document.getElementById('assignments-list');

/**
 * Llena el `select` de vendedores usado en el formulario de asignaciones.
 * Normaliza el caso cuando no hay vendedores.
 * @param {Array<Object>} sellers - Lista con `{ dni, nombre }`
 */
export function populateSellersDropdown(sellers) {
    if (!sellerSelect) return;
    if (sellers.length === 0) {
        sellerSelect.innerHTML = '<option value="">No hay vendedores registrados</option>';
        return;
    }
    sellerSelect.innerHTML = '<option value="">-- Seleccionar un vendedor --</option>';
    sellerSelect.innerHTML += sellers.map(s => `<option value="${s.dni}">${s.nombre}</option>`).join('');
}

/**
 * Llena el `select` de perímetros en el formulario de asignaciones.
 * @param {Array<Object>} perimeters - Lista de perímetros con `{ id, nombre }`
 */
export function populatePerimetersDropdown(perimeters) {
    if (!perimeterSelect) return;
    if (perimeters.length === 0) {
        perimeterSelect.innerHTML = '<option value="">No hay perímetros creados</option>';
        return;
    }
    perimeterSelect.innerHTML = '<option value="">-- Seleccionar un perímetro --</option>';
    perimeterSelect.innerHTML += perimeters.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

/**
 * Renderiza la lista de asignaciones para la fecha seleccionada.
 * Muestra hora asignada, perímetro y vendedor; añade botón para reprogramar.
 * @param {Array<Object>} assignments - Lista de asignaciones enriquecidas
 */
export function renderAssignmentsList(assignments) {
    if (!assignmentsListContainer) return;
    if (assignments.length === 0) {
        assignmentsListContainer.innerHTML = '<p>No hay asignaciones para esta fecha.</p>';
        return;
    }
    assignmentsListContainer.innerHTML = assignments.map(asig => {
        const hora = asig.fecha.toDate().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        const isRescheduled = asig.estado === 'reprogramada';
        
        const actionHtml = isRescheduled
            ? `<span class="status status-rescheduled">Reprogramada</span>`
            : `<button class="btn-reschedule" data-id="${asig.id}">Reprogramar</button>`;

        return `
            <div class="perimeter-item assignment-item ${isRescheduled ? 'rescheduled' : ''}">
                <div>
                    <h4>${hora} - ${asig.perimeterName}</h4>
                    <p>Vendedor: ${asig.sellerName}</p>
                </div>
                <div>
                    ${actionHtml}
                </div>
            </div>
        `;
    }).join('');
}

const dashboardTableBody = document.getElementById('dashboard-table-body');

/**
 * Renderiza la tabla del dashboard con los datos de asistencia.
 * Cada fila muestra fecha, vendedor, perímetro, hora asignada, entrada, salida y estado.
 * @param {Array<Object>} reportData - Datos ya procesados por `generateAttendanceReport`
 */
export function renderDashboard(reportData) {
    if (!dashboardTableBody) return;

    if (reportData.length === 0) {
        dashboardTableBody.innerHTML = '<tr><td colspan="7">No se encontraron resultados para los filtros seleccionados.</td></tr>';
        return;
    }

    const timeFormatter = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const dateFormatter = { day: '2-digit', month: '2-digit', year: 'numeric' }; // Formateador de fecha

    dashboardTableBody.innerHTML = reportData.map(row => {
        // Formatear la fecha
        const assignedDate = row.fecha.toDate().toLocaleDateString('es-PE', dateFormatter);
        
        const assignedTime = row.fecha.toDate().toLocaleTimeString('es-PE', timeFormatter);
        const checkIn = row.checkInTime ? row.checkInTime.toLocaleTimeString('es-PE', timeFormatter) : '---';
        const checkOut = row.checkOutTime ? row.checkOutTime.toLocaleTimeString('es-PE', timeFormatter) : '---';

        return `
            <tr>
                <td>${assignedDate}</td> <!-- NUEVA CELDA -->
                <td>${row.sellerName}</td>
                <td>${row.perimeterName}</td>
                <td>${assignedTime}</td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
                <td><span class="status status-${row.statusClass}">${row.status}</span></td>
            </tr>
        `;
    }).join('');
}

const dashboardSellerFilter = document.getElementById('dashboard-seller-filter');
const dashboardPerimeterFilter = document.getElementById('dashboard-perimeter-filter');

/**
 * Llena el filtro de vendedores en el dashboard.
 * @param {Array<Object>} sellers - Lista de vendedores con `{ dni, nombre }`
 */
export function populateDashboardSellerFilter(sellers) {
    if (!dashboardSellerFilter) return;
    dashboardSellerFilter.innerHTML = '<option value="">Todos los vendedores</option>';
    dashboardSellerFilter.innerHTML += sellers.map(s => `<option value="${s.dni}">${s.nombre}</option>`).join('');
}

/**
 * Llena el filtro de perímetros en el dashboard.
 * @param {Array<Object>} perimeters - Lista de perímetros con `{ id, nombre }`
 */
export function populateDashboardPerimeterFilter(perimeters) {
    if (!dashboardPerimeterFilter) return;
    dashboardPerimeterFilter.innerHTML = '<option value="">Todos los perímetros</option>';
    dashboardPerimeterFilter.innerHTML += perimeters.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}