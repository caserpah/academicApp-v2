import axios from 'axios';
import { parseError } from "../utils/errorHandler.js";

// Configura la URL base para las solicitudes HTTP
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const LOGIN_API_URL = `${API_BASE_URL}/api/auth`;

/**
 * Función para iniciar sesión y almacenar el token JWT.
 * @param {string} identificador - Documento o Correo electrónico.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<object>} Objeto con datos del usuario y el token.
 */
export const login = async (identificador, password) => {
    try {
        // Petición al endpoint: POST /api/auth/login
        const response = await axios.post(`${LOGIN_API_URL}/login`, {
            identificador,
            password
        });

        const data = response.data;

        // 🚦 Si el backend pide Onboarding o pide OTP, simplemente devolvemos la respuesta al componente
        if (data.requireOnboarding || data.requireOTP) {
            return data;
        }

        // Si el login es directo (sin OTP ni Onboarding), guardamos token
        if (data.token && data.usuario) {
            localStorage.setItem('userToken', data.token);
            localStorage.setItem('userData', JSON.stringify(data.usuario));
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            return data.usuario;
        }

    } catch (error) {
        throw parseError(error, "Error al iniciar sesión.");
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
        throw parseError(error, "Error al solicitar el restablecimiento de contraseña.");
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
    } catch (error) {
        throw parseError(error, "Error al restablecer la contraseña.");
    }
};

/**
 * Función para procesar la primera actualización de seguridad (Onboarding).
 * @param {number} usuarioId - ID del usuario oculto.
 * @param {string} email - Nuevo correo electrónico válido.
 * @param {string} newPassword - Nueva contraseña secreta.
 * @returns {Promise<object>} Respuesta de éxito del servidor.
 */
export const completarOnboarding = async (usuarioId, email, newPassword) => {
    try {
        const response = await axios.post(`${LOGIN_API_URL}/onboarding`, {
            usuarioId,
            email,
            newPassword
        });
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al actualizar los datos de seguridad.");
    }
};