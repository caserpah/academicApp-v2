import apiClient from './apiClient.js';

/**
 * Servicio de gestión de Áreas Académicas
 */

const AREAS_ENDPOINT = '/api/areas';
const VIGENCIAS_ENDPOINT = '/api/vigencias';

/* -------------------------------------------------------------------------- */
/* Funciones principales del servicio                                      */
/* -------------------------------------------------------------------------- */

// Obtiene todas las áreas y la vigencia activa con PAGINACIÓN
export const fetchInitialData = async (params = {}) => {
    try {
        // Primero obtener la vigencia activa
        const vigenciasResponse = await apiClient.get(VIGENCIAS_ENDPOINT);
        const vigenciasApi = vigenciasResponse.data;

        if (vigenciasApi.status !== 'success' || !vigenciasApi.data) {
            throw new Error(vigenciasApi.message || 'No se pudo obtener la información de vigencias.');
        }

        const vigenciasItems = vigenciasApi.data.items;

        if (!Array.isArray(vigenciasItems) || vigenciasItems.length === 0) {
            throw new Error("No se encontró ninguna vigencia. Crea una vigencia primero.");
        }

        // Buscar vigencia activa
        const vigenciaActiva = vigenciasItems.find(v => v.activa === true);

        if (!vigenciaActiva) {
            throw new Error("No hay una vigencia activa. Activa una vigencia en el sistema.");
        }

        const { page = 1, limit = 10, search = '' } = params;

        // Obtener las áreas de esa vigencia pasando los params
        const areasResponse = await apiClient.get(AREAS_ENDPOINT, {
            params: {
                vigenciaId: vigenciaActiva.id,
                page,
                limit,
                search
            }
        });

        const areasApi = areasResponse.data;
        const responseData = (areasApi.status === 'success' && areasApi.data) ? areasApi.data : {};

        // Retornar estructura completa (items + pagination + vigencia)
        return {
            items: responseData.items || [],
            pagination: responseData.pagination || {},
            vigencia: vigenciaActiva
        };

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
 * Crea una nueva área
 * @param {Object} areaData - { codigo, nombre, abreviatura, promociona, vigenciaId }
 */
export const crearArea = async (areaData) => {
    try {
        const response = await apiClient.post(AREAS_ENDPOINT, areaData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al crear el área.');
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
        throw new Error(`Ocurrió un error al crear el área: ${error.message}`);
    }
};

/**
 * Actualiza un área existente
 * @param {number} id - ID del área
 * @param {Object} areaData - Datos a actualizar
 */
export const actualizarArea = async (id, areaData) => {
    try {
        const response = await apiClient.put(`${AREAS_ENDPOINT}/${id}`, areaData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al actualizar el área.');
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

        throw new Error(`Ocurrió un error al actualizar el área: ${error.message}`);
    }
};

/**
 * Elimina un área
 * @param {number} id - ID del área
 */
export const eliminarArea = async (id) => {
    try {
        const response = await apiClient.delete(`${AREAS_ENDPOINT}/${id}`);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al eliminar el área.');
        }

        return apiData.message || 'Área eliminada correctamente.';
    } catch (error) {
        const data = error.response?.data;
        if (data?.message) {
            throw new Error(data.message);
        }
        throw new Error(`Ocurrió un error al eliminar el área: ${error.message}`);
    }
};