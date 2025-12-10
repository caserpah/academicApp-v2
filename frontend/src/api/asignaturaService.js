import apiClient from './apiClient.js';

/**
 * Servicio de gestión de Asignaturas
 */

const ASIGNATURAS_ENDPOINT = '/api/asignaturas';
const AREAS_ENDPOINT = '/api/areas';
const VIGENCIAS_ENDPOINT = '/api/vigencias';

/* -------------------------------------------------------------------------- */
/* Funciones principales del servicio                                      */
/* -------------------------------------------------------------------------- */

// Obtiene todas las asignaturas, áreas y vigencia activa
export const fetchInitialData = async () => {
    try {
        const [asignaturasResponse, areasResponse, vigenciasResponse] = await Promise.all([
            apiClient.get(ASIGNATURAS_ENDPOINT),
            apiClient.get(AREAS_ENDPOINT),
            apiClient.get(VIGENCIAS_ENDPOINT),
        ]);

        const asignaturasApi = asignaturasResponse.data;
        const areasApi = areasResponse.data;
        const vigenciasApi = vigenciasResponse.data;

        // Validar respuesta de vigencias
        if (vigenciasApi.status !== 'success' || !vigenciasApi.data) {
            throw new Error(vigenciasApi.message || 'No se pudo obtener la información de vigencias.');
        }

        const vigenciasItems = vigenciasApi.data.items;

        if (!Array.isArray(vigenciasItems) || vigenciasItems.length === 0) {
            throw new Error("No se encontró ninguna vigencia.");
        }

        // Buscar vigencia activa o tomar la primera
        const vigenciaData = vigenciasItems.find(v => v.activa) || vigenciasItems[0];

        if (!vigenciaData) {
            throw new Error("No hay una vigencia activa. Activa o seleccione una vigencia para continuar.");
        }

        // Validar respuesta de áreas
        if (areasApi.status !== 'success' || !areasApi.data) {
            throw new Error(areasApi.message || 'No se pudo obtener la lista de áreas.');
        }

        const areas = areasApi.data.items || [];

        // Validar respuesta de asignaturas
        let asignaturas = [];
        if (asignaturasApi.status === 'success' && asignaturasApi.data) {
            asignaturas = asignaturasApi.data.items || [];
        }

        return { asignaturas, areas, vigencia: vigenciaData };

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
 * Crea una nueva asignatura
 * @param {Object} asignaturaData - { codigo, nombre, abreviatura, porcentual, promociona, areaId, vigenciaId }
 */
export const crearAsignatura = async (asignaturaData) => {
    try {
        const response = await apiClient.post(ASIGNATURAS_ENDPOINT, asignaturaData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al crear la asignatura.');
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
        throw new Error(`Ocurrió un error al crear la asignatura: ${error.message}`);
    }
};

/**
 * Actualiza una asignatura existente
 * @param {number} id - ID de la asignatura
 * @param {Object} asignaturaData - Datos a actualizar
 */
export const actualizarAsignatura = async (id, asignaturaData) => {
    try {
        const response = await apiClient.put(`${ASIGNATURAS_ENDPOINT}/${id}`, asignaturaData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al actualizar la asignatura.');
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

        throw new Error(`Ocurrió un error al actualizar la asignatura: ${error.message}`);
    }
};

/**
 * Elimina una asignatura
 * @param {number} id - ID de la asignatura
 */
export const eliminarAsignatura = async (id) => {
    try {
        const response = await apiClient.delete(`${ASIGNATURAS_ENDPOINT}/${id}`);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al eliminar la asignatura.');
        }

        return apiData.message || 'Asignatura eliminada correctamente.';
    } catch (error) {
        const data = error.response?.data;
        if (data?.message) {
            throw new Error(data.message);
        }
        throw new Error(`Ocurrió un error al eliminar la asignatura: ${error.message}`);
    }
};