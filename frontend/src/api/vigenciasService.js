import apiClient from "./apiClient.js";

/**
 * Servicio de gestión de Vigencias o Años Lectivos
 */

const VIGENCIAS_ENDPOINT = '/api/vigencias';

// Obtiene todas las vigencias o años lectivos
export const fetchVigencias = async () => {
    try {
        const response = await apiClient.get(VIGENCIAS_ENDPOINT);
        if (response.data.status !== 'success') throw new Error(response.data.message);
        return response.data.data.items || [];
    } catch (error) {
        throw new Error(error.response?.data?.message || 'Error al obtener vigencias.');
    }
};

export const crearVigencia = async (data) => {
    try {
        const response = await apiClient.post(VIGENCIAS_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error);
    }
};

export const actualizarVigencia = async (id, data) => {
    try {
        const response = await apiClient.put(`${VIGENCIAS_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error);
    }
};

export const eliminarVigencia = async (id, anio) => {
    try {
        const response = await apiClient.delete(`${VIGENCIAS_ENDPOINT}/${id}`, { params: { anio } });
        return response.data.message;
    } catch (error) {
        throw parseError(error);
    }
};

export const abrirVigencia = async (id) => {
    const response = await apiClient.post(`${VIGENCIAS_ENDPOINT}/${id}/abrir`);
    return response.data.data;
};

export const cerrarVigencia = async (id) => {
    const response = await apiClient.post(`${VIGENCIAS_ENDPOINT}/${id}/cerrar`);
    return response.data.data;
};

// Helper para errores
const parseError = (error) => {
    const apiError = error.response?.data;
    if (apiError?.errors && Array.isArray(apiError.errors)) {
        return new Error(apiError.errors[0].message);
    }
    return new Error(apiError?.message || "Ocurrió un error en el servicio de estudiantes.");
};