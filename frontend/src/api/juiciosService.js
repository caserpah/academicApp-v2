import apiClient from './apiClient.js';
import { parseError } from "../utils/errorHandler.js";

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
        throw parseError(error, "Error al cargar datos iniciales de juicios.");
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
        throw parseError(error, "Error al obtener juicios.");
    }
};

// ... Métodos CRUD (Crear, Actualizar, Eliminar) ...

export const crearJuicio = async (data) => {
    try {
        const response = await apiClient.post(JUICIOS_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al crear el juicio.");
    }
};

export const actualizarJuicio = async (id, data) => {
    try {
        const response = await apiClient.put(`${JUICIOS_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al actualizar el juicio.");
    }
};

export const eliminarJuicio = async (id) => {
    try {
        const response = await apiClient.delete(`${JUICIOS_ENDPOINT}/${id}`);
        return response.data.message;
    } catch (error) {
        throw parseError(error, "Error al eliminar el juicio.");
    }
};

/* -------------------------------------------------------------------------- */
/* Funciones de Importación Masiva                                            */
/* -------------------------------------------------------------------------- */

export const descargarPlantilla = async () => {
    try {
        const response = await apiClient.get(`${JUICIOS_ENDPOINT}/plantilla/descargar`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'Plantilla_Juicios.xlsx');
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        throw parseError(error, "Error al descargar la plantilla de juicios.");
    }
};

/**
 * Importar Archivo CSV
 * Realiza la validación y el guardado en un solo paso.
 * Si hay errores, el backend devolverá 400 y la lista de errores.
 */
export const importarArchivo = async (file) => {
    try {
        const formData = new FormData();
        formData.append('archivo', file);

        // Llamamos a la ruta única '/importar'
        const response = await apiClient.post(`${JUICIOS_ENDPOINT}/importar`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        // Si es 200 OK, devolvemos el éxito
        return response.data;
    } catch (error) {
        // Si el backend devuelve 400 con errores detallados, los parseamos para que el UI pueda mostrarlos
        // parseError debería ser capaz de capturar response.data.errors
        const apiError = error.response?.data;

        if (apiError?.errors && Array.isArray(apiError.errors)) {
            // Devolvemos el objeto de error estructurado para que el UI pueda mostrar la lista
            const errorValidacion = new Error("El archivo contiene errores.");
            errorValidacion.listaErrores = apiError.errors;
            throw errorValidacion;
        }

        throw parseError(error, "Error al importar el archivo de juicios.");
    }
};