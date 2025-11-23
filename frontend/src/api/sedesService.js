import apiClient from './apiClient.js';

/**
 * Servicio de gestión de Sedes
 */

const SEDES_ENDPOINT = '/api/sedes';
const COLEGIOS_ENDPOINT = '/api/colegios';

/* -------------------------------------------------------------------------- */
/* Funciones principales del servicio                                      */
/* -------------------------------------------------------------------------- */

// Obtiene todas las sedes y el colegio principal
export const fetchInitialData = async () => {
    try {
        const [sedesResponse, colegioResponse] = await Promise.all([
            apiClient.get(SEDES_ENDPOINT),
            apiClient.get(COLEGIOS_ENDPOINT),
        ]);

        const sedesApi = sedesResponse.data;
        const colegioApi = colegioResponse.data;

        // Validar respuesta del backend
        if (sedesApi.status !== 'success' || !sedesApi.data) {
            throw new Error(sedesApi.message || 'No se pudo obtener la lista de sedes.');
        }

        // Extraemos las sedes de la respuesta
        const sedes = sedesApi.data.items;

        if (!Array.isArray(sedes)) {
            throw new Error('El formato recibido de sedes es inválido.');
        }

        // Validar colegio
        if (colegioApi.status !== 'success' || !colegioApi.data) {
            throw new Error(colegioApi.message || 'No se pudo obtener la información del colegio.');
        }

        // Extraemos el colegio de la respuesta
        const colegioItems = colegioApi.data.items;

        if (!Array.isArray(colegioItems) || colegioItems.length === 0) {
            throw new Error("No se encontró el colegio principal.");
        }

        const colegioData = colegioItems[0];

        return { sedes, colegio: colegioData };

    } catch (error) {
        console.error('Error en fetchInitialData:', error);

        const msg =
            error.response?.data?.message ||
            error.message ||
            'Ocurrió un error al obtener los datos iniciales.';

        throw new Error(msg);
    }
};

/**
 * Crea una nueva sede
 * @param {Object} sedeData - { codigo, nombre, direccion, contacto, colegioId }
 */
export const crearSede = async (sedeData) => {
    try {
        const response = await apiClient.post(SEDES_ENDPOINT, sedeData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al crear la sede.');
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
        throw new Error(`Ocurrió un error al crear la sede: ${error.message}`);
    }
};

/**
 * Actualiza una sede existente
 * @param {number} id - ID de la sede
 * @param {Object} sedeData - Datos a actualizar
 */
export const actualizarSede = async (id, sedeData) => {
    try {
        const response = await apiClient.put(`${SEDES_ENDPOINT}/${id}`, sedeData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al actualizar la sede.');
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

        throw new Error(`Ocurrió un error al actualizar la sede: ${error.message}`);
    }
};

/**
 * Elimina una sede
 * @param {number} id - ID de la sede
 */
export const eliminarSede = async (id) => {
    try {
        const response = await apiClient.delete(`${SEDES_ENDPOINT}/${id}`);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al eliminar la sede.');
        }

        return apiData.message || 'Sede eliminada correctamente.';
    } catch (error) {
        const data = error.response?.data;
        if (data?.message) {
            throw new Error(data.message);
        }
        throw new Error(`Ocurrió un error al eliminar la sede: ${error.message}`);
    }
};