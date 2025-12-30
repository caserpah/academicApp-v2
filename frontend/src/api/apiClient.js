import axios from 'axios';

/**
 * API Client centralizado para la aplicación.
 * Configura una instancia de Axios con:
 *  - Base URL desde variables de entorno.
 *  - Interceptor de solicitud para adjuntar token JWT.
 *  - Interceptor de respuesta para manejar errores 401/403 globalmente.
 *
 * Uso:
 *   import apiClient from '@/api/ApiClient';
 *   apiClient.get('/colegios');
 */

// Define las URLs de la API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor de Solicitudes: Adjunta el token JWT (userToken) a cada petición
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('userToken'); // Usamos la clave correcta

        // Adjunta el token solo si existe y la URL no es la de login
        if (token && config.url && !config.url.endsWith('/auth/login')) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interceptor de Respuestas: Maneja errores globales (como 401 o 403)
apiClient.interceptors.response.use(
    (response) => response, // Si la respuesta es exitosa, la devuelve tal cual
    (error) => {
            // Si el token es inválido o ha expirado, redirige al login
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                localStorage.removeItem('userToken');
                window.location.href = '/login';
            }
            // Propaga el error para que los servicios o componentes puedan manejarlo también
            return Promise.reject(error);
        }
);

// Exportamos la instancia configurada
export default apiClient;