import apiClient from './apiClient.js';

/**
 * Servicio de gestión de Coordinadores
 */

const COORDINADORES_ENDPOINT = '/api/coordinadores';
const SEDES_ENDPOINT = '/api/sedes';

/* -------------------------------------------------------------------------- */
/* Funciones principales del servicio                                      */
/* -------------------------------------------------------------------------- */

// Obtiene todos los coordinadores y sedes
export const fetchCoordinadores = async () => {
    try {
        const [coordinadoresResponse, sedesResponse] = await Promise.all([
            apiClient.get(COORDINADORES_ENDPOINT),
            apiClient.get(SEDES_ENDPOINT),
        ]);

        const coordinadoresApi = coordinadoresResponse.data;
        const sedesApi = sedesResponse.data;

        // Validar respuesta de coordinadores
        if (coordinadoresApi.status !== 'success' || !coordinadoresApi.data) {
            throw new Error(coordinadoresApi.message || 'No se pudo obtener la lista de coordinadores.');
        }

        const coordinadores = coordinadoresApi.data.items || [];

        // Validar respuesta de sedes
        if (sedesApi.status !== 'success' || !sedesApi.data) {
            throw new Error(sedesApi.message || 'No se pudo obtener la lista de sedes.');
        }

        const sedes = sedesApi.data.items || [];

        return { coordinadores, sedes };

    } catch (error) {
        console.error('Error en fetchCoordinadores:', error);

        const msg =
            error.response?.data?.message ||
            error.message ||
            'Ocurrió un error al obtener los datos de coordinadores.';

        throw new Error(msg);
    }
};

export const fetchSedes = async () => {
    try {
        const response = await apiClient.get(SEDES_ENDPOINT);
        const apiData = response.data;

        if (apiData.status !== 'success' || !apiData.data) {
            throw new Error(apiData.message || 'No se pudo obtener la lista de sedes.');
        }

        return apiData.data.items || [];
    } catch (error) {
        console.error('Error en fetchSedes:', error);
        throw new Error(error.response?.data?.message || 'Error al obtener sedes.');
    }
};

/**
 * Crea un nuevo coordinador
 * @param {Object} coordinadorData - { numeroDocumento, nombres, email, contacto, direccion }
 */
export const crearCoordinador = async (coordinadorData) => {
    try {
        const response = await apiClient.post(COORDINADORES_ENDPOINT, coordinadorData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al crear el coordinador.');
        }

        return apiData.data;
    } catch (error) {
        const data = error.response?.data;
        const status = error.response?.status;

        // Error de validación (422)
        if (status === 422 && Array.isArray(data?.errors)) {
            const primerError = data.errors[0];
            const mensaje =
                primerError.message || primerError.msg || 'Error de validación.';
            throw new Error(mensaje);
        }

        // Error controlado (404, 409, etc.)
        if (data?.message) {
            throw new Error(data.message);
        }

        // Genérico
        throw new Error(`Ocurrió un error al crear el coordinador: ${error.message}`);
    }
};

/**
 * Actualiza un coordinador existente
 * @param {number} id - ID del coordinador
 * @param {Object} coordinadorData - Datos a actualizar
 */
export const actualizarCoordinador = async (id, coordinadorData) => {
    try {
        const response = await apiClient.put(`${COORDINADORES_ENDPOINT}/${id}`, coordinadorData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al actualizar el coordinador.');
        }

        return apiData.data;
    } catch (error) {
        const data = error.response?.data;
        const status = error.response?.status;

        if (status === 422 && Array.isArray(data?.errors)) {
            const primerError = data.errors[0];
            const mensaje =
                primerError.message || primerError.msg || 'Error de validación.';
            throw new Error(mensaje);
        }

        if (data?.message) {
            throw new Error(data.message);
        }

        throw new Error(`Ocurrió un error al actualizar el coordinador: ${error.message}`);
    }
};

/**
 * Elimina un coordinador
 * @param {number} id - ID del coordinador
 */
export const eliminarCoordinador = async (id) => {
    try {
        const response = await apiClient.delete(`${COORDINADORES_ENDPOINT}/${id}`);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al eliminar el coordinador.');
        }

        return apiData.message || 'Coordinador eliminado correctamente.';
    } catch (error) {
        const data = error.response?.data;
        if (data?.message) {
            throw new Error(data.message);
        }
        throw new Error(`Ocurrió un error al eliminar el coordinador: ${error.message}`);
    }
};

/**
 * Asigna una sede a un coordinador
 * @param {number} coordinadorId - ID del coordinador
 * @param {Object} sedeData - { sedeId, jornada }
 */
export const asignarSedeCoordinador = async (coordinadorId, sedeData) => {
    try {
        const response = await apiClient.post(`${COORDINADORES_ENDPOINT}/${coordinadorId}/sedes`, sedeData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al asignar la sede.');
        }

        return apiData.data;
    } catch (error) {
        const data = error.response?.data;
        const status = error.response?.status;

        if (status === 422 && Array.isArray(data?.errors)) {
            const primerError = data.errors[0];
            const mensaje =
                primerError.message || primerError.msg || 'Error de validación.';
            throw new Error(mensaje);
        }

        if (data?.message) {
            throw new Error(data.message);
        }

        throw new Error(`Ocurrió un error al asignar la sede: ${error.message}`);
    }
};