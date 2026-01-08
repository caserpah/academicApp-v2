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
            apiClient.get(`${JUICIOS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}`),
            apiClient.get(`${ASIGNATURAS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}`),
            apiClient.get(GRADOS_ENDPOINT),
            apiClient.get(DIMENSIONES_ENDPOINT),
            apiClient.get(DESEMPENOS_ENDPOINT),
            // El backend filtra por vigencia usando el token (req.vigenciaActual)
            apiClient.get(RANGOS_ENDPOINT)
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
        const msg = error.response?.data?.message || error.message || 'Error cargando datos iniciales.';
        throw new Error(msg);
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
        throw new Error(error.response?.data?.message || 'Error cargando juicios.');
    }
};

// ... Métodos CRUD (Crear, Actualizar, Eliminar) ...

export const crearJuicio = async (data) => {
    const response = await apiClient.post(JUICIOS_ENDPOINT, data);
    return response.data.data;
};

export const actualizarJuicio = async (id, data) => {
    const response = await apiClient.put(`${JUICIOS_ENDPOINT}/${id}`, data);
    return response.data.data;
};

export const eliminarJuicio = async (id) => {
    const response = await apiClient.delete(`${JUICIOS_ENDPOINT}/${id}`);
    return response.data.message;
};