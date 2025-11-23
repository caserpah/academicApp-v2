// ======== Contexto de Autenticación ========
/* Pernmite que cualquier componente de la aplicación acceda al estado
del usuario y a las funciones para login y logout. */

import React, { createContext, useContext, useState, useEffect } from 'react';
//import { login as apiLogin, logout as apiLogout, getCurrentUser } from '../api/authService.js';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

// Define la URL base del backend
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// FUNCIONES AUXILIARES PARA MANEJO DEL TOKEN EN LOCAL STORAGE

// Función para verificar si el token ha expirado
const isTokenExpired = (token) => {
    if (!token) return true;

    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000; // Tiempo actual en segundos

        // Si la expiración (exp) es menor que el tiempo actual, ha expirado
        return decoded.exp < currentTime;
    } catch (error) {
        // Si no se puede decodificar (token mal formado o inválido), lo consideramos expirado
        console.error("Token no válido o mal formado:", error);
        return true;
    }
};

// PROVEEDOR DEL CONTEXTO
// Envuelve la aplicación y provee el contexto de autenticación

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const navigate = useNavigate();

    // Lógica que se ejecuta al montar el componente (Verificación de token)
    useEffect(() => {
        const checkAuthStatus = () => {
            const token = localStorage.getItem('userToken');
            const userDataString = localStorage.getItem('userData');

            if (token && userDataString && !isTokenExpired(token)) {
                // Si el token existe y es válido/no ha expirado
                try {
                    const userData = JSON.parse(userDataString);

                    setUser(userData);
                    setIsAuthenticated(true);
                } catch {
                    // Si falla al parsear userData, limpiamos
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('userData');
                    setIsAuthenticated(false);
                }
            } else {
                // Si no hay token o ha expirado, forzamos la limpieza
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                setIsAuthenticated(false);
            }

            setLoading(false);
        };

        checkAuthStatus();
    }, []);

    // Función de Login
    const login = async (email, password) => {
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
            const { token, usuario: userData } = response.data;

            // Guardar datos en localStorage
            localStorage.setItem('userToken', token);
            localStorage.setItem('userData', JSON.stringify(userData));

            // Actualizar estado
            setUser(userData);
            setIsAuthenticated(true);

            return userData;

        } catch (error) {
            // Re-lanzar el error para que el componente Login lo maneje (e.g., SweetAlert)
            throw error.response?.data || new Error("Error de conexión con el servidor.");
        }
    };

    // Función de Logout
    const logout = () => {
        // Limpiar localStorage
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');

        // Limpiar estado
        setUser(null);
        setIsAuthenticated(false);

        // Redirigir al login (aunque ProtectedRoute también lo haría)
        navigate('/login');
    };

    // Función para verificar roles
    const hasRole = (requiredRole) => {
        if (!user || !user.role) return false;

        // Maneja si requiredRole es un array o una cadena simple
        const rolesToCheck = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        return rolesToCheck.includes(user.role);
    };


    // Objeto de valor para el contexto
    const contextValue = {
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        hasRole,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {/* Solo renderizamos los hijos cuando la verificación inicial haya terminado */}
            {!loading ? (
                children
            ) : (
                <div className="flex items-center justify-center min-h-screen text-xl text-gray-500">
                    Inicializando la sesión y verificando credenciales...
                </div>
            )}
        </AuthContext.Provider>
    );
};

// HOOK PERSONALIZADO

export const useAuth = () => {
    return useContext(AuthContext);
};