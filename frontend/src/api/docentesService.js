import apiClient from "./apiClient.js";

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
        throw new Error(error.response?.data?.message || "No se pudieron cargar los datos de docentes.");
    }
};

export const crearDocente = async (data) => {
    try {
        const response = await apiClient.post(DOCENTES_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        handleError(error, "Error al crear docente");
    }
};

export const actualizarDocente = async (id, data) => {
    try {
        const response = await apiClient.put(`${DOCENTES_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        handleError(error, "Error al actualizar docente");
    }
};

export const eliminarDocente = async (id) => {
    try {
        const response = await apiClient.delete(`${DOCENTES_ENDPOINT}/${id}`);
        return response.data.message;
    } catch (error) {
        handleError(error, "Error al eliminar docente");
    }
};

// Helper para errores
const handleError = (error, actionMessage) => {
    const data = error.response?.data;
    const status = error.response?.status;

    if (status === 422 && data?.errors && Array.isArray(data.errors)) {
        const primerError = data.errors[0];
        const mensaje = primerError.msg || primerError.message || "Error de validación.";
        throw new Error(mensaje);
    }
    if (data?.message) {
        throw new Error(data.message);
    }
    throw new Error(`${actionMessage}: ${error.message}`);
};