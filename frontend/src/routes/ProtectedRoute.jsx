import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Swal from 'sweetalert2';

/**
 * Componente que protege rutas según autenticación y rol.
 * @param {string} requiredRoles - El rol que se requiere para acceder a la ruta (ej: 'admin').
 * @param {object} props - Propiedades de la ruta.
 */
const ProtectedRoute = ({ requiredRoles, children }) => {
    // Obtenemos el estado del contexto
    const { isAuthenticated, hasRole, user, loading } = useAuth();

    // 1. Si está cargando la sesión (leyendo localStorage), mostramos un spinner o nada
    if (loading) {
        return <div className="p-10 text-center text-gray-500">Cargando...</div>;
    }

    // 2. Verificación Básica: Autenticación y existencia de Usuario
    // IMPORTANTE: Verificamos 'user' para evitar el error "reading 'role' of undefined"
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    // 3. Verificación de Rol
    if (requiredRoles && !hasRole(requiredRoles)) {
        Swal.fire({
            icon: 'warning',
            title: 'Acceso Denegado',
            text: `Tu rol (${user.role}) no tiene permiso para acceder a esta sección.`,
            confirmButtonColor: '#ff9800'
        });
        return <Navigate to="/bienvenida" replace />;
    }

    // 4. Renderizado
    if (children) {
        return children;
    }
    return <Outlet />;
};

export default ProtectedRoute;