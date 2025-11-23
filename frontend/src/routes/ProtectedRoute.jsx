import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Swal from 'sweetalert2';

/**
 * Componente que protege rutas según autenticación y rol.
 * @param {string} requiredRole - El rol que se requiere para acceder a la ruta (ej: 'admin').
 * @param {object} props - Propiedades de la ruta.
 */
const ProtectedRoute = ({ requiredRole, children }) => {
    const { isAuthenticated, hasRole, user } = useAuth();

    // Verificación 1: Usuario no autenticado (Aplica para todas las rutas protegidas)
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Verificación 2: Si se requiere un rol y si el usuario lo tiene
    if (requiredRole && !hasRole(requiredRole)) {
        // Alerta de acceso denegado
        Swal.fire({
            icon: 'warning',
            title: 'Acceso Denegado',
            text: `Tu rol (${user.role}) no tiene permiso para acceder a esta sección.`,
            confirmButtonColor: '#ff9800'
        });

        // Redirige al Dashboard/Bienvenida
        return <Navigate to="/bienvenida" replace />;
    }

    // Si se usa como envoltorio (con children), renderiza el contenido
    if (children) {
        return children;
    }

    // Permite el acceso al componente hijo (la página)
    return <Outlet />;
};

export default ProtectedRoute;