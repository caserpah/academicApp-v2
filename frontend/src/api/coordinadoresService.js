import apiClient from "./apiClient.js";

const COORDINADORES_ENDPOINT = '/api/coordinadores';
const SEDES_ENDPOINT = '/api/sedes';
const VIGENCIAS_ENDPOINT = '/api/vigencias';

export const fetchInitialData = async () => {
    try {
        // Consultamos coordinadores, sedes y vigencias en paralelo
        const [coordinadoresRes, sedesRes, vigenciasRes] = await Promise.all([
            apiClient.get(COORDINADORES_ENDPOINT),
            apiClient.get(SEDES_ENDPOINT),
            apiClient.get(VIGENCIAS_ENDPOINT)
        ]);

        return {
            coordinadores: coordinadoresRes.data.data.items || [],
            sedes: sedesRes.data.data.items || [],
            vigencias: vigenciasRes.data.data.items || []
        };
    } catch (error) {
        throw new Error(error.response?.data?.message || "Error cargando datos iniciales.");
    }
};

export const crearCoordinador = async (data) => {
    try {
        const response = await apiClient.post(COORDINADORES_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error);
    }
};

export const actualizarCoordinador = async (id, data) => {
    try {
        const response = await apiClient.put(`${COORDINADORES_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error);
    }
};

export const eliminarCoordinador = async (id) => {
    try {
        const response = await apiClient.delete(`${COORDINADORES_ENDPOINT}/${id}`);
        return response.data.message;
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