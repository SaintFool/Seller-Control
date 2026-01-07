import { firebaseConfig } from '../../js/firebase-config.js';
import { 
    updateAdminInfo, renderPerimeters, showSection, showMessage, 
    populateSellersDropdown, populatePerimetersDropdown, renderAssignmentsList,
    renderDashboard, populateDashboardSellerFilter, populateDashboardPerimeterFilter
} from './ui-admin.js';
import { 
    getPerimeters, savePerimeter, getSellers, createAssignment, 
    getAssignmentsByDate, rescheduleAssignment, generateAttendanceReport 
} from './firestore-admin.js';
import { 
    loadGoogleMaps, initMap, updateCircleRadius, getPerimeterCenter 
} from './maps-admin.js';

/* Inicialización de Firebase y estado global del módulo */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Cache local de perímetros para búsquedas/filtrado sin reconsultar la base
let allPerimetersCache = []; 
// Datos actuales del reporte para permitir exportar a Excel
let currentReportData = []; 

// --- PROTECCIÓN DE RUTA ---
// Verifica sesión y carga datos iniciales (mapas + datos) si hay usuario
auth.onAuthStateChanged(async (user) => {
    if (user) {
        updateAdminInfo(user.email);
        try {
            await loadGoogleMaps();
            await refreshData();
        } catch (error) {
            console.error("Error carga inicial:", error);
        }
    } else {
        window.location.href = '../index.html';
    }
});

/**
 * Refresca datos principales en memoria y actualiza UI:
 * - Perímetros (cache local y render)
 * - Vendedores (dropdowns)
 * - Filtros del dashboard
 */
async function refreshData() {
    allPerimetersCache = await getPerimeters(db);
    const sellers = await getSellers(db);

    renderPerimeters(allPerimetersCache);
    
    // Si hay término de búsqueda activo, re-disparar para filtrar resultados
    const searchInput = document.getElementById('perimeter-search');
    if (searchInput && searchInput.value) {
        searchInput.dispatchEvent(new Event('input'));
    }

    populatePerimetersDropdown(allPerimetersCache);
    populateSellersDropdown(sellers);
    populateDashboardPerimeterFilter(allPerimetersCache);
    populateDashboardSellerFilter(sellers);
}

document.getElementById('logout-button').addEventListener('click', () => {
    auth.signOut().then(() => window.location.href = '../index.html');
});

// --- NAVEGACIÓN ---
document.querySelector('nav').addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-btn')) {
        const section = e.target.dataset.section;
        showSection(section);
        if (section === 'create-section') {
            initMap('create-map', null, 100, (hasCenter) => {
                document.getElementById('create-btn').disabled = !hasCenter;
            });
        }
    }
});

// --- CREAR PERÍMETROS ---
document.getElementById('create-perimeter-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('create-btn');
    btn.disabled = true; btn.textContent = 'Guardando...';

    const id = document.getElementById('create-id').value;
    const name = document.getElementById('create-name').value;
    const district = document.getElementById('create-district').value;
    const radius = parseInt(document.getElementById('create-radius').value, 10);
    const center = getPerimeterCenter();

    if (/\s/.test(id) || !center) {
        showMessage('Error: ID sin espacios y selecciona centro en mapa.', 'error');
        btn.disabled = false; btn.textContent = 'Guardar Nuevo Perímetro';
        return;
    }

    try {
        await savePerimeter(db, { id, name, district, radius, center });
        showMessage('Perímetro creado exitosamente.', 'success');
        e.target.reset();
        await refreshData();
        initMap('create-map', null, 100, () => {});
    } catch (error) {
        console.error(error); showMessage('Error al guardar.', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar Nuevo Perímetro';
    }
});

document.getElementById('create-radius').addEventListener('input', (e) => {
    if (e.target.value > 0) updateCircleRadius(parseInt(e.target.value, 10));
});

// --- EDITAR PERÍMETROS ---
const editListView = document.getElementById('edit-list-view');
const editFormView = document.getElementById('edit-form-view');

document.getElementById('perimeter-search').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filteredPerimeters = allPerimetersCache.filter(p => 
        p.nombre.toLowerCase().includes(term) || 
        p.id.toLowerCase().includes(term) ||
        p.distrito.toLowerCase().includes(term)
    );
    renderPerimeters(filteredPerimeters);
});

document.getElementById('perimeters-list').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-edit-perimeter')) {
        const id = e.target.dataset.id;
        startEditing(id);
    }
});

/**
 * Comienza el flujo de edición para un perímetro específico:
 * - Rellena el formulario de edición
 * - Muestra la vista de formulario y oculta la lista
 * - Inicializa el mapa en modo edición con centro y radio existentes
 */
function startEditing(id) {
    const perimeter = allPerimetersCache.find(p => p.id === id);
    if (!perimeter) return;

    document.getElementById('edit-id').value = perimeter.id;
    document.getElementById('edit-name').value = perimeter.nombre;
    document.getElementById('edit-district').value = perimeter.distrito;
    document.getElementById('edit-radius').value = perimeter.radioMetros;
    document.getElementById('editing-perimeter-name-display').textContent = perimeter.nombre;

    editListView.classList.add('hidden');
    editFormView.classList.remove('hidden');

    // Inicializamos el mapa en la ubicación del perímetro para permitir ajustes
    initMap('edit-map', perimeter.centro, perimeter.radioMetros, () => {});
}

document.getElementById('back-to-list-btn').addEventListener('click', () => {
    editFormView.classList.add('hidden');
    editListView.classList.remove('hidden');
});

document.getElementById('edit-radius').addEventListener('input', (e) => {
    if (e.target.value > 0) updateCircleRadius(parseInt(e.target.value, 10));
});

document.getElementById('edit-perimeter-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('update-btn');
    btn.disabled = true; btn.textContent = 'Actualizando...';

    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const district = document.getElementById('edit-district').value;
    const radius = parseInt(document.getElementById('edit-radius').value, 10);
    const center = getPerimeterCenter(); 

    try {
        await savePerimeter(db, { id, name, district, radius, center });
        showMessage('Perímetro actualizado.', 'success');
        await refreshData();
        
        editFormView.classList.add('hidden');
        editListView.classList.remove('hidden');
    } catch (error) {
        console.error(error); showMessage('Error al actualizar.', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar Cambios';
    }
});

// --- ASIGNACIONES ---
const assignmentForm = document.getElementById('assignment-form');
const assignmentDateField = document.getElementById('assignment-datetime');

assignmentForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const saveBtn = document.getElementById('save-assignment-btn');
    saveBtn.disabled = true;

    const data = {
        sellerDNI: document.getElementById('seller-select').value,
        perimeterID: document.getElementById('perimeter-select').value,
        dateTime: document.getElementById('assignment-datetime').value
    };

    if (!data.sellerDNI || !data.perimeterID || !data.dateTime) {
        showMessage('Campos incompletos.', 'error'); saveBtn.disabled = false; return;
    }
        
    try {
        await createAssignment(db, data);
        showMessage('Asignación creada.', 'success');
        await updateAssignmentsListView(data.dateTime.split('T')[0]); 
        event.target.reset();
    } catch (error) {
        console.error(error); showMessage('Error al crear.', 'error');
    } finally {
        saveBtn.disabled = false;
    }
});

assignmentDateField.addEventListener('change', (e) => {
    if(e.target.value) updateAssignmentsListView(e.target.value.split('T')[0]);
});

/**
 * Recupera y renderiza la lista de asignaciones para una fecha dada (YYYY-MM-DD).
 */
async function updateAssignmentsListView(date) {
    try {
        const assignments = await getAssignmentsByDate(db, date);
        renderAssignmentsList(assignments);
    } catch (error) { console.error(error); }
}

document.getElementById('assignments-list').addEventListener('click', async (event) => {
    if (event.target.classList.contains('btn-reschedule')) {
        if (!confirm('¿Marcar como reprogramada?')) return;
        try {
            await rescheduleAssignment(db, event.target.dataset.id);
            showMessage('Reprogramada.', 'success');
            const date = assignmentDateField.value.split('T')[0];
            if(date) updateAssignmentsListView(date);
        } catch (error) { showMessage('Error al actualizar.', 'error'); }
    }
});

// --- DASHBOARD ---
const filterBtn = document.getElementById('dashboard-filter-btn');
const exportBtn = document.getElementById('dashboard-export-btn');

filterBtn.addEventListener('click', async () => {
    const filters = {
        startDate: document.getElementById('dashboard-start-date').value,
        endDate: document.getElementById('dashboard-end-date').value,
        sellerDNI: document.getElementById('dashboard-seller-filter').value,
        perimeterID: document.getElementById('dashboard-perimeter-filter').value
    };

    if (!filters.startDate || !filters.endDate) {
        showMessage('Faltan fechas.', 'error'); return;
    }

    document.getElementById('dashboard-table-body').innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';
    filterBtn.disabled = true;
    exportBtn.disabled = true; // Deshabilitar exportar mientras carga

    try {
        // Guardamos los datos en la variable global
        currentReportData = await generateAttendanceReport(db, filters);
        renderDashboard(currentReportData);
        
        // Habilitar exportar solo si hay datos
        if (currentReportData.length > 0) {
            exportBtn.disabled = false;
        } else {
            exportBtn.disabled = true;
        }

    } catch (error) {
        console.error(error); showMessage('Error reporte.', 'error');
    } finally {
        filterBtn.disabled = false;
    }
});

// --- EXPORTAR A EXCEL (NUEVO) ---
exportBtn.addEventListener('click', () => {
    if (currentReportData.length === 0) {
        showMessage('No hay datos para exportar.', 'error');
        return;
    }

    const timeFormatter = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    const dateFormatter = { day: '2-digit', month: '2-digit', year: 'numeric' };

    // 1. Mapear datos a un formato limpio para Excel
    const excelData = currentReportData.map(row => ({
        "Fecha": row.fecha.toDate().toLocaleDateString('es-PE', dateFormatter),
        "Vendedor": row.sellerName,
        "Perímetro": row.perimeterName,
        "Hora Asignada": row.fecha.toDate().toLocaleTimeString('es-PE', timeFormatter),
        "Hora Entrada": row.checkInTime ? row.checkInTime.toLocaleTimeString('es-PE', timeFormatter) : '---',
        "Hora Salida": row.checkOutTime ? row.checkOutTime.toLocaleTimeString('es-PE', timeFormatter) : '---',
        "Estado": row.status
    }));

    // 2. Crear hoja de cálculo
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Asistencia");

    // 3. Descargar archivo
    XLSX.writeFile(wb, `Reporte_Asistencias_${new Date().toISOString().split('T')[0]}.xlsx`);
});

document.getElementById('dashboard-clear-btn').addEventListener('click', () => {
    document.querySelectorAll('.dashboard-filters input, .dashboard-filters select').forEach(i => i.value = '');
    document.getElementById('dashboard-table-body').innerHTML = '<tr><td colspan="7">Esperando filtros...</td></tr>';
    currentReportData = [];
    exportBtn.disabled = true;
});