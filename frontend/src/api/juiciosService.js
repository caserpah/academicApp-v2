import apiClient from './apiClient.js';

/**
 * Servicio de gestión de Juicios
 */

const JUICIOS_ENDPOINT = '/api/juicios';
const ASIGNATURAS_ENDPOINT = '/api/asignaturas';
const VIGENCIAS_ENDPOINT = '/api/vigencias';
const GRADOS_ENDPOINT = '/api/grados';
const DIMENSIONES_ENDPOINT = '/api/dimensiones';
const DESEMPENOS_ENDPOINT = '/api/desempenos';
const RANGOS_ENDPOINT = '/api/desempenos/rangos';

/* ------------------------------------------------ */
/* Helper para extraer mensajes de error detallados */
/* ------------------------------------------------ */
const parseError = (error) => {
    // Intentamos leer response.data (donde el backend manda el JSON)
    const apiError = error.response?.data;

    // Si hay un array 'errors' (típico de validaciones o tu middleware), tomamos el primero
    if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        // Puede venir como string directo o como objeto { message: '...' }
        const firstError = apiError.errors[0];
        return new Error(firstError.message || firstError);
    }

    // Si no, usamos el mensaje genérico 'message' o un fallback
    return new Error(apiError?.message || error.message || "Ocurrió un error en el servicio de juicios.");
};

/* -------------------------------------------------------------------------- */
/* Funciones principales del servicio                                      */
/* -------------------------------------------------------------------------- */

/**
 * Obtiene todos los datos iniciales necesarios para el módulo.
 * Carga catálogos (Grados, Dimensiones, Desempeños) y datos transaccionales (Juicios).
 */
export const fetchCatalogs = async () => {
    try {
        // Obtener vigencias para encontrar la activa
        const vigenciasResponse = await apiClient.get(VIGENCIAS_ENDPOINT);
        const vigenciasItems = vigenciasResponse.data?.data?.items || [];

        const vigenciaActiva = vigenciasItems.find(v => v.activa === true);

        if (!vigenciaActiva) throw new Error("No se encontró una vigencia activa.");

        // Cargar todo lo demás en paralelo
        // Nota: Rangos de desempeño y Juicios dependen de la vigencia.
        // Los Grados, Dimensiones y Desempeños son catálogos globales.
        const [
            juiciosRes,
            asignaturasRes,
            gradosRes,
            dimensionesRes,
            desempenosRes,
            rangosRes
        ] = await Promise.all([
            // El backend filtra por vigencia usando el token (req.vigenciaActual)
            apiClient.get(`${JUICIOS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}`),
            apiClient.get(`${ASIGNATURAS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}&limit=100&activo=true`),
            apiClient.get(`${GRADOS_ENDPOINT}?limit=100`),
            apiClient.get(`${DIMENSIONES_ENDPOINT}?limit=100`),
            apiClient.get(`${DESEMPENOS_ENDPOINT}?limit=100`),
            apiClient.get(`${RANGOS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}&limit=100`)
        ]);

        // Helper para extraer datos de la estructura estandar: { data: ... } o { data: { items: ... } }
        const extract = (res) => res.data?.data?.items || res.data?.data || [];

        return {
            vigencia: vigenciaActiva,
            juicios: extract(juiciosRes),
            asignaturas: extract(asignaturasRes),
            grados: extract(gradosRes),
            dimensiones: extract(dimensionesRes),
            desempenos: extract(desempenosRes),
            rangos: extract(rangosRes)
        };

    } catch (error) {
        console.error('Error en fetchCatalogs:', error);
        throw parseError(error); // Usamos el helper
    }
};

/**
 * Carga los Juicios con Filtros y Paginación
 * @param {Object} params - { page, limit, gradoId, asignaturaId, dimensionId, periodo, vigenciaId }
 */
export const fetchJuiciosPaginated = async (params) => {
    try {
        // Limpiamos params vacíos para no enviarlos como string vacía ""
        const cleanParams = {};
        Object.keys(params).forEach(key => {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                cleanParams[key] = params[key];
            }
        });

        const response = await apiClient.get(JUICIOS_ENDPOINT, { params: cleanParams });
        return response.data.data; // Debe devolver { items: [], pagination: {} }
    } catch (error) {
        throw parseError(error); // Usamos el helper
    }
};

// ... Métodos CRUD (Crear, Actualizar, Eliminar) ...

export const crearJuicio = async (data) => {
    try {
        const response = await apiClient.post(JUICIOS_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error);
    }
};

export const actualizarJuicio = async (id, data) => {
    try {
        const response = await apiClient.put(`${JUICIOS_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error);
    }
};

export const eliminarJuicio = async (id) => {
    try {
        const response = await apiClient.delete(`${JUICIOS_ENDPOINT}/${id}`);
        return response.data.message;
    } catch (error) {
        throw parseError(error);
    }
};