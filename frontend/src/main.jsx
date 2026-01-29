import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';

// ----------------- Configuración de Font Awesome -----------------
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  // Iconos de sistema
  faBars,           // Icono Botón Hanburguer
  faSearch,         // Icono de Busqueda
  faHome,           // Icono de Inicio
  faSignOutAlt,     // Icono de Cerrar Sesión
  faChevronDown,
  faChevronRight,
  faSave,           // Guardar
  faXmark,          // Cancelar
  faEdit,           // Editar
  faPenToSquare,    // Editar
  faTrash,          // Eliminar
  faSpinner,        // Spinner de carga
  faInfoCircle,     // Información
  faUserCircle,     // Icono de usuario
  faCirclePlus,     // Añadir nuevo
  faTimesCircle,    // Cerrar o eliminar
  faTimes,          // Cerrar modal
  faAnglesLeft,
  faAngleLeft,
  faAngleRight,
  faAnglesRight,

  // Iconos del Menú Institucional
  faSchool,           // Colegios
  faBuilding,         // Sedes
  faUserTie,          // Coordinadores
  faCalendarAlt,      // Calendario

  // Iconos de Gestión Académica
  faLayerGroup,       // Áreas
  faBookOpen,         // Asignaturas
  faUsersRectangle,   // Grupos
  faChalkboardUser,   // Carga Académica
  faPersonChalkboard, // Docentes

  // Iconos de Estudiantes
  faFilePen,          // Matrículas
  faUsers,            // Estudiantes
  faHandsHoldingChild,// Acudientes

  // Iconos de Evaluación
  faStar,             // Calificaciones
  faChartSimple,      // Indicadores
  faGavel,             // Juicios

  faEnvelope,

} from '@fortawesome/free-solid-svg-icons';

// Añade TODOS los iconos a la librería global
library.add(
faBars, faSearch, faHome, faSignOutAlt, faChevronDown, faStar,
faChevronRight,faSave, faXmark, faEdit, faPenToSquare, faChartSimple,
faTrash, faSpinner, faInfoCircle,faUserCircle, faCirclePlus, faGavel,
faTimesCircle, faTimes, faAnglesLeft,faAngleLeft, faAngleRight,
faAnglesRight, faSchool, faBuilding, faUserTie, faCalendarAlt,
faLayerGroup, faBookOpen, faUsersRectangle, faChalkboardUser,
faEnvelope, faFilePen, faUsers, faHandsHoldingChild, faPersonChalkboard
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