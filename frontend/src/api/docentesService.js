import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";

const DOCENTES_ENDPOINT = '/api/docentes';

/**
 * Obtiene datos iniciales: Lista de Áreas y Docentes (paginados)
 * @param {Object} params - { page, limit, busqueda }
 */
export const fetchDocentesData = async (params = {}) => {
    try {
        // Convertimos params a query string
        const queryParams = new URLSearchParams(params).toString();

        const response = await apiClient.get(`${DOCENTES_ENDPOINT}?${queryParams}`);

        return {
            docentesData: response.data.data, // { items, total, page, limit }
        };
    } catch (error) {
        throw parseError(error, "No se pudieron cargar los datos de docentes.");
    }
};

export const crearDocente = async (data) => {
    try {
        const response = await apiClient.post(DOCENTES_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al crear docente");
    }
};

export const actualizarDocente = async (id, data) => {
    try {
        const response = await apiClient.put(`${DOCENTES_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al actualizar docente");
    }
};

export const eliminarDocente = async (id) => {
    try {
        const response = await apiClient.delete(`${DOCENTES_ENDPOINT}/${id}`);
        return response.data.message;
    } catch (error) {
        throw parseError(error, "Error al eliminar docente");
    }
};