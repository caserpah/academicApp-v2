import apiClient from './apiClient.js';

/**
 * Servicio de gestión de Juicios
 */

const JUICIOS_ENDPOINT = '/api/juicios';
const ASIGNATURAS_ENDPOINT = '/api/asignaturas';
const VIGENCIAS_ENDPOINT = '/api/vigencias';

/* -------------------------------------------------------------------------- */
/* Funciones principales del servicio                                      */
/* -------------------------------------------------------------------------- */

// Obtiene todos los juicios, asignaturas y la vigencia activa
export const fetchInitialData = async () => {
    try {
        // Obtener vigencias para encontrar la activa
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

        // Obtener datos relacionados en paralelo
        const [juiciosResponse, asignaturasResponse] = await Promise.all([
            apiClient.get(`${JUICIOS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}`),
            apiClient.get(`${ASIGNATURAS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}`)
        ]);

        const juiciosApi = juiciosResponse.data;
        const asignaturasApi = asignaturasResponse.data;

        // Validar y extraer juicios
        if (juiciosApi.status !== 'success' || !juiciosApi.data) {
            throw new Error(juiciosApi.message || 'No se pudo obtener la lista de juicios.');
        }
        const juicios = juiciosApi.data.items || [];

        // Validar y extraer asignaturas
        const asignaturas = (asignaturasApi.status === 'success' && asignaturasApi.data)
            ? asignaturasApi.data.items
            : [];

        return {
            juicios,
            asignaturas,
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
 * Crea un nuevo juicio
 * @param {Object} juicioData - { tipo, grado, periodo, dimension, desempeno, minNota, maxNota, texto, activo, asignaturaId, vigenciaId }
 */
export const crearJuicio = async (juicioData) => {
    try {
        const response = await apiClient.post(JUICIOS_ENDPOINT, juicioData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al crear el juicio.');
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
        throw new Error(`Ocurrió un error al crear el juicio: ${error.message}`);
    }
};

/**
 * Actualiza un juicio existente
 * @param {number} id - ID del juicio
 * @param {Object} juicioData - Datos a actualizar
 */
export const actualizarJuicio = async (id, juicioData) => {
    try {
        const response = await apiClient.put(`${JUICIOS_ENDPOINT}/${id}`, juicioData);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al actualizar el juicio.');
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

        throw new Error(`Ocurrió un error al actualizar el juicio: ${error.message}`);
    }
};

/**
 * Elimina un juicio
 * @param {number} id - ID del juicio
 */
export const eliminarJuicio = async (id) => {
    try {
        const response = await apiClient.delete(`${JUICIOS_ENDPOINT}/${id}`);
        const apiData = response.data;

        if (apiData.status !== 'success') {
            throw new Error(apiData.message || 'Ocurrió un error al eliminar el juicio.');
        }

        return apiData.message || 'Juicio eliminado correctamente.';
    } catch (error) {
        const data = error.response?.data;
        if (data?.message) {
            throw new Error(data.message);
        }
        throw new Error(`Ocurrió un error al eliminar el juicio: ${error.message}`);
    }
};