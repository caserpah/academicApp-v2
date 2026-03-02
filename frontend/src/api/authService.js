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

/**
 * Función para solicitar un nuevo OTP para restablecer la contraseña.
 * @param {string} email - Correo electrónico del usuario.
 * @returns {Promise<string>} El correo al que se envió el OTP (para pre-llenar el formulario).
 * Nota: El backend siempre responde con éxito para evitar revelar si el email existe o no.
 */
export const requestPasswordReset = async (email) => {
    try {
        const response = await axios.post(`${LOGIN_API_URL}/forgot-password`, { email });
        return response.data.email; // Devuelve el email para pre-llenar el formulario (opcional)
    }
    catch (error) {
        const errorMessage = error.response?.data?.message || 'Error al solicitar el restablecimiento de contraseña.';
        throw new Error(errorMessage);
    }
};

/**
 * Función para restablecer la contraseña utilizando el OTP.
 * @param {string} email - Correo electrónico del usuario.
 * @param {string} otp - Código OTP recibido por correo.
 */
export const confirmPasswordReset = async (email, otp, newPassword) => {
    try {
        await axios.post(`${LOGIN_API_URL}/reset-password`, {
            email,
            otp,
            newPassword
        });
    }   catch (error) {
        const errorMessage = error.response?.data?.message || 'Error al restablecer la contraseña.';
        throw new Error(errorMessage);
    }
};