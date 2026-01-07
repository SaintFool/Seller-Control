Si quieres probar la demo envíame un correo y te daré el enlace con mucho gusto :)

# 📍 Seller Control - Sistema de Asistencia Georreferenciado

![Estado del Proyecto](https://img.shields.io/badge/Estado-Terminado-success)
![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)
![Javascript](https://img.shields.io/badge/Lenguaje-Vanilla%20JS-yellow)

Aplicación web diseñada para gestionar y validar la asistencia de personal de campo (vendedores) mediante **Geofencing**. El sistema permite a los administradores crear perímetros en un mapa y valida si el empleado está físicamente dentro del rango permitido al momento de marcar su entrada o salida.

---

## 🚀 Características Principales

### 👨‍💼 Panel de Administración
*   **Gestión de Perímetros:** Creación, edición y eliminación de zonas geográficas usando Google Maps interactivo.
*   **Asignación de Turnos:** Vinculación de vendedores a perímetros específicos por fecha y hora.
*   **Dashboard en Tiempo Real:** Visualización de asistencias con indicadores de estado (A tiempo, Tarde, Ausente, Completado).
*   **Filtros Avanzados:** Búsqueda por rango de fechas, vendedor o perímetro.
*   **Exportación de Datos:** Generación de reportes detallados en formato **Excel (.xlsx)** usando SheetJS.

### 📱 App del Vendedor (Mobile First)
*   **Login Seguro:** Autenticación y redirección basada en roles.
*   **Mis Asignaciones:** Visualización de las tareas del día.
*   **Geolocalización:** Validación GPS en el navegador del cliente.
*   **Lógica de Distancia:** Cálculo matemático (Fórmula de Haversine) para impedir el "Check-in" si el usuario está fuera del radio permitido.

---

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** HTML5, CSS3 (Diseño Responsivo), JavaScript (ES6 Modules).
*   **Backend (BaaS):** Firebase (Google).
    *   **Firestore:** Base de datos NoSQL en tiempo real.
    *   **Authentication:** Gestión de usuarios y sesiones.
    *   **Hosting:** Despliegue de la aplicación.
*   **APIs Externas:**
    *   **Google Maps JavaScript API:** Visualización de mapas y marcadores.
*   **Librerías:**
    *   `xlsx` (SheetJS): Para la exportación de reportes.

---

## 📂 Estructura del Proyecto

El proyecto está dividido en dos módulos lógicos dentro de la carpeta `public/`:

public/
├── admin/          # SPA para el Administrador
│   ├── js/maps-admin.js    # Lógica de mapas (Google Maps)
│   ├── js/firestore-admin.js # Consultas a BD y lógica de negocio
│   └── ...
├── app/            # SPA para el Vendedor (Móvil)
│   ├── js/maps.js          # Visualización de zona asignada
│   ├── js/utils.js         # Cálculo de distancia (Haversine)
│   └── ...
└── js/             # Configuración compartida (Firebase Config)

## ⚙️ Configuración e Instalación
Para correr este proyecto localmente:
Clonar el repositorio:
code
Bash
git clone https://github.com/SaintFool/Seller-Control.git
cd Seller-Control
Configurar Firebase:
Crea un proyecto en Firebase Console.
Habilita Authentication (Email/Password).
Habilita Firestore Database.
Crea un archivo public/js/firebase-config.js con tus credenciales:
code
JavaScript
export const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO_ID",
    // ... resto de credenciales
};

Configurar Google Maps:
Obtén una API Key en Google Cloud Platform.
Habilita la Maps JavaScript API.
Reemplaza la API Key en los archivos maps.js y maps-admin.js.
Desplegar:
Necesitas tener instalada la CLI de Firebase.
code
Bash
firebase login
firebase deploy --only hosting

🧠 Base de Datos (Firestore)
El sistema utiliza una estructura relacional simplificada en NoSQL:
users: Usuarios del sistema (Rol Admin o Vendedor).
perimetros: Coordenadas centrales (GeoPoint) y radio en metros.
asignaciones: Relación entre un Vendedor, un Perímetro y una Fecha.
asistencias: Registro histórico del Check-in/Check-out, incluyendo la ubicación real del dispositivo y la distancia al centro al momento de marcar.

📄 Licencia
Este proyecto está bajo la licencia MIT. Siéntete libre de usarlo y modificarlo para tus propios proyectos.

Autor: Jose Carlos Pozo Benavides.
