import { firebaseConfig } from './firebase-config.js';

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

const loginForm = document.getElementById('loginForm');
const errorMsg = document.getElementById('error-msg');
const loadingMsg = document.getElementById('loading-msg');
const btnLogin = document.getElementById('btn-login');

auth.onAuthStateChanged(async (user) => {
    if (user) {
        checkRoleAndRedirect(user);
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.style.display = 'none';
    loadingMsg.style.display = 'block';
    btnLogin.disabled = true;

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error(error);
        showError("Credenciales incorrectas o error de conexión.");
        auth.signOut();
    }
});

async function checkRoleAndRedirect(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();

        if (userDoc.exists) {
            const role = userDoc.data().rol;
            if (role === 'admin') {
                window.location.href = 'admin/index.html';
            } else if (role === 'vendedor') {
                window.location.href = 'app/index.html';
            } else {
                showError("Tu usuario no tiene un rol asignado.");
                auth.signOut();
            }
        } else {
            showError("Usuario no encontrado en la base de datos.");
            auth.signOut();
        }
    } catch (error) {
        console.error("Error verificando rol:", error);
        showError("Error del sistema al verificar permisos.");
        auth.signOut();
    }
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
    loadingMsg.style.display = 'none';
    btnLogin.disabled = false;
}