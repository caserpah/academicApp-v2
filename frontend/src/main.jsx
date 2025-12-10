import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';

// ----------------- Configuración de Font Awesome -----------------
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  // Iconos de ejemplo
  faHouse,
  faUser,
  faEnvelope,

  // Iconos necesarios para la Sidebar y Navbar:
  faSearch,          // Barra de búsqueda
  faFolderOpen,      // Registros Preliminares
  faChevronRight,    // Toggle del submenú (derecha)
  faChevronDown,     // Toggle del submenú (abajo)
  faFilePen,         // Matrícula
  faUsers,           // Estudiantes
  faHandsHoldingChild, // Acudientes
  faUserTie,         // Coordinadores
  faSchool,          // Colegios
  faBookOpen,       // Asignaturas
  faStar,             // Calificaciones
  faBuilding,        // Usado para Sedes
  faSave,            // Guardar
  faXmark,         // Cancelar
  faEdit,           // Editar
  faPenToSquare,     // Editar
  faTrash,           // Eliminar
  faSpinner,          // Spinner de carga
  faInfoCircle,   // Información
  faSignOutAlt,    // Cerrar sesión
  faUserCircle,    // Icono de usuario
  faCirclePlus,   // Añadir nuevo
  faTimesCircle, // Cerrar o eliminar
  faTimes,         // Cerrar modal
  faAnglesLeft,
  faAngleLeft,
  faAngleRight,
  faAnglesRight,
} from '@fortawesome/free-solid-svg-icons';

// Añade TODOS los iconos a la librería global
library.add(
  faHouse,
  faUser,
  faEnvelope,
  faSearch,
  faFolderOpen,
  faChevronRight,
  faChevronDown,
  faFilePen,
  faUsers,
  faHandsHoldingChild,
  faUserTie,
  faSchool,
  faBookOpen,
  faStar,
  faBuilding,
  faSave,
  faXmark,
  faEdit,
  faPenToSquare,
  faTrash,
  faSpinner,
  faInfoCircle,
  faSignOutAlt,
  faUserCircle,
  faCirclePlus,
  faTimesCircle,
  faTimes,
  faAnglesLeft,
  faAngleLeft,
  faAngleRight,
  faAnglesRight
);
// -----------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);