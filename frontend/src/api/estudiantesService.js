import apiClient from "./apiClient.js";

const ENDPOINT = "/api/estudiantes";

/**
 * Listar Estudiantes (Buscador)
 * Permite buscar por documento, nombre, código, etc.
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.limit=10]
 * @param {string} [params.busqueda] - Texto a buscar (Documento o Nombre)
 * @param {string} [params.estado] - "ACTIVO", "RETIRADO", etc.
 */
export const listarEstudiantes = async (params = {}) => {
    try {
        const response = await apiClient.get(ENDPOINT, { params });

        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || "Error al obtener estudiantes");
        }

        return apiData.data; // Retorna { items: [...], total: ... }
    } catch (error) {
        throw new Error(error.response?.data?.message || "Error al conectar con el servicio de estudiantes.");
    }
};

/**
 * Obtener Estudiante por ID
 * Útil para validar o mostrar detalles antes de matricular.
 */
export const obtenerEstudiante = async (id, params = {}) => {
    try {
        const response = await apiClient.get(`${ENDPOINT}/${id}`, { params });
        const apiData = response.data;
        return apiData.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Error al obtener el estudiante.");
    }
};

/**
 * Crear Estudiante
 */
export const crearEstudiante = async (data) => {
    try {
        const response = await apiClient.post(ENDPOINT, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Actualizar Estudiante
 */
export const actualizarEstudiante = async (id, data) => {
    try {
        const response = await apiClient.put(`${ENDPOINT}/${id}`, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Eliminar Estudiante
 */
export const eliminarEstudiante = async (id) => {
    try {
        const response = await apiClient.delete(`${ENDPOINT}/${id}`);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
};

// Helper para errores
const parseError = (error) => {
    const apiError = error.response?.data;
    if (apiError?.errors && Array.isArray(apiError.errors)) {
        return new Error(apiError.errors[0].message);
    }
    return new Error(apiError?.message || "Ocurrió un error en el servicio de estudiantes.");
};