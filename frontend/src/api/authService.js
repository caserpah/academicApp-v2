import axios from 'axios';

// Configura la URL base para las solicitudes HTTP
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const LOGIN_API_URL = `${API_BASE_URL}/api/auth`;

/**
 * Función para iniciar sesión y almacenar el token JWT.
 * @param {string} email - Correo electrónico del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<object>} Objeto con datos del usuario y el token.
 */
export const login = async (email, password) => {
    try {
        // Petición al endpoint: POST /api/auth/login
        const response = await axios.post(`${LOGIN_API_URL}/login`, {
            email,
            password
        });

        // Se desestructura la respuesta para obtener 'token' y 'usuario'
        const { token, usuario } = response.data;

        if (token && usuario) {
            // 1. Almacenar el token y los datos del usuario en localStorage
            localStorage.setItem('userToken', token);
            localStorage.setItem('userData', JSON.stringify(usuario)); // // Guardamos el objeto 'usuario'

            // 2. Configurar el header de autorización por defecto para futuras peticiones
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            return usuario; // Devolvemos los datos del usuario para el contexto
        }

    } catch (error) {
        // Manejo de errores de credenciales (ej: 401 Unauthorized)
        const errorMessage = error.response?.data?.message || 'Error de conexión o credenciales inválidas.';
        throw new Error(errorMessage);
    }
};

/**
 * Función para cerrar sesión y limpiar el almacenamiento local.
 */
export const logout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    delete axios.defaults.headers.common['Authorization'];
};

/**
 * Función para obtener el estado de autenticación actual al cargar la app.
 */
export const getCurrentUser = () => {
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('userToken');

    if (userData && token) {
        // Configurar el token si existe (útil al recargar la página)
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return JSON.parse(userData);
    }
    return null;
};