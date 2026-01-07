/**
 * Recupera todas las asignaciones del día para el vendedor actual.
 * Pasos principales:
 * 1) Obtener el DNI del vendedor desde `users` (si no se pasó `userData`).
 * 2) Consultar `asignaciones` filtrando por `vendedorID` y rango de hoy.
 * 3) Enriquecer cada asignación con datos del perímetro y la asistencia (si existe).
 *
 * @param {firebase.firestore.Firestore} db - instancia de Firestore
 * @param {string} userId - UID del usuario autenticado
 * @param {object|null} userData - (Opcional) documento `users` ya cargado para evitar reconsulta
 * @returns {Promise<Array<Object>>} Lista de asignaciones enriquecidas
 */
export async function findTodaysAssignments(db, userId, userData = null) {
    let vendedorDNI;
    if (!userData) {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return [];
        userData = userDoc.data();
    }

    // 1. Obtenemos el DNI directamente del perfil de usuario
    vendedorDNI = userData.dni;

    if (!vendedorDNI) {
        console.warn('El usuario no tiene DNI configurado en su perfil de users.');
        return [];
    }
    
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 2. Realizar la consulta a 'asignaciones' usando el DNI obtenido
    const assignmentQuery = await db.collection('asignaciones')
        .where('vendedorID', '==', vendedorDNI)
        .where('fecha', '>=', startOfToday)
        .where('fecha', '<=', endOfToday)
        .orderBy('fecha')
        .get();
        
    if (assignmentQuery.empty) {
        return [];
    }

    const assignments = assignmentQuery.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Enriquecer cada asignación con datos del perímetro y del documento de asistencia
    const enrichedAssignmentsPromises = assignments.map(async (asig) => {
        const perimetroDoc = await db.collection('perimetros').doc(asig.perimetroID).get();
        if (!perimetroDoc.exists) {
            return null; // Si no existe el perimetro, ignoramos la asignación
        }

        // En esta app la convención de ID de asistencias es `${assignmentId}_${userUid}`
        const attendanceDocId = `${asig.id}_${userId}`;
        const attendanceDoc = await db.collection('asistencias').doc(attendanceDocId).get();
        const attendanceData = attendanceDoc.exists ? attendanceDoc.data() : {};

        return {
            ...asig,
            perimeterData: perimetroDoc.data(),
            checkInTime: attendanceData.timestampEntrada || null,
            checkOutTime: attendanceData.timestampSalida || null,
        };
    });

    const resolvedAssignments = await Promise.all(enrichedAssignmentsPromises);
    return resolvedAssignments.filter(Boolean);
}


/**
 * Registra la ENTRADA para una asignación específica.
 */
export async function recordCheckIn(db, auth, userLocation, assignment, distancia) {
    const user = auth.currentUser;
    const attendanceDocId = `${assignment.id}_${user.uid}`;
    
    // CAMBIO: Leemos 'users' para obtener nombre y DNI
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : { nombre: user.email, dni: 'SIN-DNI' };
    // Guardar registro de entrada con metadatos para trazabilidad
    await db.collection('asistencias').doc(attendanceDocId).set({
        userId: user.uid,
        userEmail: user.email,
        nombreVendedor: userData.nombre,
        dniVendedor: userData.dni, // DNI obtenido de users
        perimetroId: assignment.perimetroID,
        nombrePerimetro: assignment.perimeterData.nombre,
        timestampEntrada: firebase.firestore.FieldValue.serverTimestamp(),
        ubicacionEntrada: new firebase.firestore.GeoPoint(userLocation.latitude, userLocation.longitude),
        distanciaMetrosEntrada: Math.round(distancia),
        timestampSalida: null,
    });
}

/**
 * Registra la SALIDA para una asignación específica.
 */
export async function recordCheckOut(db, auth, userLocation, assignment, distancia) {
    const user = auth.currentUser;
    const attendanceDocId = `${assignment.id}_${user.uid}`;
    // Actualizar el documento de asistencia con la salida y la ubicación final
    await db.collection('asistencias').doc(attendanceDocId).update({
        timestampSalida: firebase.firestore.FieldValue.serverTimestamp(),
        ubicacionSalida: new firebase.firestore.GeoPoint(userLocation.latitude, userLocation.longitude),
        distanciaMetrosSalida: Math.round(distancia),
    });
}