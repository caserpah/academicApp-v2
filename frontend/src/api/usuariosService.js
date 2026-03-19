import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";

const USERS_ENDPOINT = '/api/usuarios';

// Obtener lista de usuarios
export const fetchUsers = async () => {
    try {
        const response = await apiClient.get(USERS_ENDPOINT);
        if (response.data.status === 'success') {
            return response.data.data.items;
        }
        return [];
    } catch (error) {
        throw parseError(error, "Error al cargar usuarios");
    }
};

// Crear usuario
export const crearUsuario = async (userData) => {
    try {
        const response = await apiClient.post('/api/auth/registro', userData);
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al crear el usuario");
    }
};

// Actualizar usuario
export const actualizarUsuario = async (id, userData) => {
    try {
        const response = await apiClient.put(`${USERS_ENDPOINT}/${id}`, userData);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al actualizar el usuario");
    }
};

// Eliminar usuario
export const eliminarUsuario = async (id) => {
    try {
        const response = await apiClient.delete(`${USERS_ENDPOINT}/${id}`);
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al eliminar el usuario");
    }
};