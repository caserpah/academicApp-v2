import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";

const VENTANAS_ENDPOINT = '/api/ventanas-calificacion';

/**
 * Obtiene el listado de ventanas con filtros
 */
export const fetchVentanas = async (params = {}) => {
    try {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v != null && v !== "")
        );
        const queryParams = new URLSearchParams(cleanParams).toString();
        const response = await apiClient.get(`${VENTANAS_ENDPOINT}?${queryParams}`);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al cargar las ventanas de calificación");
    }
};

/**
 * Catálogos necesarios (Vigencias para el filtro o formulario)
 */
export const fetchVentanasCatalogs = async () => {
    try {
        const response = await apiClient.get('/api/vigencias');
        return {
            vigencias: response.data.data.items || response.data.data || []
        };
    } catch (error) {
        console.error("Error cargando catálogos", error);
        throw parseError(error, "No se pudieron cargar las vigencias.");
    }
};

export const crearVentana = async (data) => {
    try {
        const response = await apiClient.post(VENTANAS_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al crear la ventana");
    }
};

export const actualizarVentana = async (id, data) => {
    try {
        const response = await apiClient.put(`${VENTANAS_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al actualizar la ventana");
    }
};

export const eliminarVentana = async (id) => {
    try {
        const response = await apiClient.delete(`${VENTANAS_ENDPOINT}/${id}`);
        return response.data.message;
    } catch (error) {
        throw parseError(error, "Error al eliminar la ventana");
    }
};