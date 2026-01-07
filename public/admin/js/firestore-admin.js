// --- FUNCIONES ESENCIALES ---

/**
 * Recupera todos los perímetros ordenados por nombre.
 * @param {firebase.firestore.Firestore} db - instancia de Firestore
 * @returns {Promise<Array<Object>>} Lista de perímetros con `id` y campos del documento
 */
export async function getPerimeters(db) {
    const querySnapshot = await db.collection('perimetros').orderBy('nombre').get();
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Obtiene los usuarios con rol 'vendedor' y normaliza campos básicos.
 * Retorna una lista de objetos `{ dni, nombre, uid }` ordenada por nombre.
 */
export async function getSellers(db) {
    const querySnapshot = await db.collection('users')
        .where('rol', '==', 'vendedor')
        .get();
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            dni: data.dni || 'SIN-DNI', 
            nombre: data.nombre || 'Sin Nombre',
            uid: doc.id 
        };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre)); 
}

/**
 * Crea o actualiza un documento de perímetro con la estructura esperada.
 * Convierte el centro en `GeoPoint` para almacenamiento en Firestore.
 */
export async function savePerimeter(db, { id, name, district, radius, center }) {
    await db.collection('perimetros').doc(id).set({
        nombre: name,
        distrito: district,
        radioMetros: radius,
        centro: new firebase.firestore.GeoPoint(center.lat, center.lng)
    });
}

// NUEVA FUNCIÓN: Eliminar perímetro
export async function deletePerimeter(db, perimeterId) {
    await db.collection('perimetros').doc(perimeterId).delete();
}

/**
 * Crea una nueva asignación (vendedor, perimetro, fecha).
 * `dateTime` debe ser una cadena válida que `new Date()` pueda parsear.
 */
export async function createAssignment(db, { sellerDNI, perimeterID, dateTime }) {
    await db.collection('asignaciones').add({
        vendedorID: sellerDNI, 
        perimetroID: perimeterID,
        fecha: firebase.firestore.Timestamp.fromDate(new Date(dateTime))
    });
}

/**
 * Helper: construye un rango (Date) para un día completo dado 'YYYY-MM-DD'.
 * Usado por consultas que filtran asignaciones por día.
 */
function getDateRange(dateString) {
    const startOfDay = new Date(dateString + 'T00:00:00');
    const endOfDay = new Date(dateString + 'T23:59:59');
    return { startOfDay, endOfDay };
}

/**
 * Recupera asignaciones para una fecha (YYYY-MM-DD) y enriquece con nombres
 * legibles de vendedor y perímetro para mostrar en el UI.
 */
export async function getAssignmentsByDate(db, date) {
    const { startOfDay, endOfDay } = getDateRange(date);

    const querySnapshot = await db.collection('asignaciones')
        .where('fecha', '>=', startOfDay)
        .where('fecha', '<=', endOfDay)
        .orderBy('fecha')
        .get();

    const assignments = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const sellers = await getSellers(db);
    const perimeters = await getPerimeters(db);
    
    const sellersMap = new Map(sellers.map(s => [s.dni, s.nombre]));
    const perimetersMap = new Map(perimeters.map(p => [p.id, p.nombre]));

    return assignments.map(asig => ({
        ...asig,
        sellerName: sellersMap.get(asig.vendedorID) || 'Vendedor no encontrado',
        perimeterName: perimetersMap.get(asig.perimetroID) || 'Perímetro Desconocido'
    }));
}

/**
 * Marca una asignación con estado 'reprogramada'.
 * @param {string} assignmentId - ID del documento de asignación
 */
export async function rescheduleAssignment(db, assignmentId) {
    const assignmentRef = db.collection('asignaciones').doc(assignmentId);
    await assignmentRef.update({
        estado: 'reprogramada'
    });
}


// --- FUNCIÓN DE REPORTE (ACTUALIZADA PARA USAR 'USERS') ---

/**
 * Construye rango Date para consultas entre dos fechas inclusivas.
 */
function getDateRangeForQuery(startDateString, endDateString) {
    const start = new Date(startDateString + 'T00:00:00');
    const end = new Date(endDateString + 'T23:59:59');
    return { start, end };
}

/**
 * Genera un reporte de asistencias entre dos fechas (inclusive) y opcionalmente
 * filtrado por vendedor o perimetro. Devuelve una lista de objetos que incluyen
 * times de ingreso/salida y estado calculado ('Ausente', 'En Progreso', 'Tarde', 'Completado').
 *
 * Implementación detallada:
 * - Consulta `asignaciones` entre `startDate` y `endDate`.
 * - Recupera la lista de vendedores (users) y periféricos para enriquecer los datos.
 * - Construye IDs esperados de documento en `asistencias` siguiendo la convención
 *   `${assignmentId}_${userId}` y consulta esos documentos en bloques usando `in`.
 * - Calcula `checkInTime`, `checkOutTime` y `status` según timestamps encontrados.
 */
export async function generateAttendanceReport(db, { startDate, endDate, sellerDNI, perimeterID }) {
    const { start, end } = getDateRangeForQuery(startDate, endDate);

    let assignmentQuery = db.collection('asignaciones')
        .where('fecha', '>=', start)
        .where('fecha', '<=', end);

    if (sellerDNI) {
        assignmentQuery = assignmentQuery.where('vendedorID', '==', sellerDNI);
    }
    if (perimeterID) {
        assignmentQuery = assignmentQuery.where('perimetroID', '==', perimeterID);
    }
    
    const assignmentSnapshot = await assignmentQuery.get();
        
    if (assignmentSnapshot.empty) return [];
    
    const assignments = assignmentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    assignments.sort((a, b) => a.fecha.seconds - b.fecha.seconds);

    // Mapa de vendedores: clave = dni -> { nombre, userID }
    const usersSnapshot = await db.collection('users').where('rol', '==', 'vendedor').get();
    
    const sellersMap = new Map(usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return [data.dni, { nombre: data.nombre, userID: doc.id }];
    }));
    
    const perimetersSnapshot = await db.collection('perimetros').get();
    const perimetersMap = new Map(perimetersSnapshot.docs.map(doc => [doc.id, doc.data().nombre]));

    // Construir los IDs esperados en la colección 'asistencias' y consultar
    // en chunks de 10 para cumplir con la limitación del operador 'in'.
    const attendanceDocIds = assignments
        .map(asig => {
            const sellerInfo = sellersMap.get(asig.vendedorID);
            return (sellerInfo && sellerInfo.userID) ? `${asig.id}_${sellerInfo.userID}` : null;
        })
        .filter(Boolean);

    let attendanceMap = new Map();

    if (attendanceDocIds.length > 0) {
        const chunks = [];
        for (let i = 0; i < attendanceDocIds.length; i += 10) {
            chunks.push(attendanceDocIds.slice(i, i + 10));
        }

        const promises = chunks.map(chunk => 
            db.collection('asistencias')
                .where(firebase.firestore.FieldPath.documentId(), 'in', chunk)
                .get()
        );

        const snapshots = await Promise.all(promises);

        snapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                attendanceMap.set(doc.id, doc.data());
            });
        });
    }

    const reportData = assignments.map(asig => {
        const sellerInfo = sellersMap.get(asig.vendedorID);
        const perimeterName = perimetersMap.get(asig.perimetroID);

        if (!sellerInfo) return null; // Ignorar asignaciones sin info de vendedor

        const attendanceDocId = sellerInfo.userID ? `${asig.id}_${sellerInfo.userID}` : null;
        const attendanceData = attendanceDocId ? attendanceMap.get(attendanceDocId) : null;

        let checkInTime = null;
        let checkOutTime = null;
        let status = 'Ausente';
        let statusClass = 'absent';

        if (attendanceData) {
            const assignedTime = asig.fecha.toDate();
            if (attendanceData.timestampEntrada) {
                checkInTime = attendanceData.timestampEntrada.toDate();
                const tolerance = 15 * 60 * 1000;
                status = (checkInTime.getTime() > assignedTime.getTime() + tolerance) ? 'Tarde' : 'En Progreso';
                statusClass = (checkInTime.getTime() > assignedTime.getTime() + tolerance) ? 'late' : 'inprogress';
            }
            if (attendanceData.timestampSalida) {
                checkOutTime = attendanceData.timestampSalida.toDate();
                status = 'Completado';
                statusClass = 'completed';
            }
        }

        return {
            ...asig,
            sellerName: sellerInfo.nombre,
            perimeterName: perimeterName || 'Perímetro Desconocido',
            checkInTime,
            checkOutTime,
            status,
            statusClass,
        };
    });

    return reportData.filter(Boolean);
}