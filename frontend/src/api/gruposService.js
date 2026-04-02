import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";

const GRUPOS_ENDPOINT = "/api/grupos";
const GRADOS_ENDPOINT = "/api/grados";
const SEDES_ENDPOINT = "/api/sedes";
const DOCENTES_ENDPOINT = "/api/docentes";
const VIGENCIAS_ENDPOINT = '/api/vigencias';

/**
 * Obtener grupos por sede y vigencia activa
 */
export const fetchGruposPorSede = async (sedeId) => {
    try {
        const response = await apiClient.get(GRUPOS_ENDPOINT, {
            params: {
                sedeId,
                includeGrado: true,
                soloActivos: true,
                limit: 100 // Para obtener todos los grupos sin paginación
            }
        });

        const apiData = response.data;

        if (apiData.status !== "success") {
            throw new Error(apiData.message || "Error al obtener grupos");
        }

        return apiData.data.items || [];

    } catch (error) {
        throw parseError(error, "Error al obtener grupos");
    }
};

/**
 * Obtiene los datos iniciales: Lista de grupos y catálogos para los selects
 * @param {Object} filtros - Filtros opcionales { nombre, sedeId, jornada, etc. }
 */
export const fetchInitialData = async (filtros = {}) => {
    try {
        // Limpiamos filtros vacíos
        const params = Object.fromEntries(
            Object.entries(filtros).filter(([_, v]) => v != null && v !== "")
        );

        const [gruposRes, gradosRes, sedesRes, docentesRes, vigenciaRes] = await Promise.all([
            apiClient.get(GRUPOS_ENDPOINT, { params }),
            apiClient.get(GRADOS_ENDPOINT, { params: { limit: 100 } }),
            apiClient.get(SEDES_ENDPOINT, { params: { limit: 100 } }),
            apiClient.get(DOCENTES_ENDPOINT, { params: { limit: 100 } }),
            apiClient.get(VIGENCIAS_ENDPOINT),
        ]);

        return {
            grupos: gruposRes.data.data?.items || [],
            paginacion: gruposRes.data.data?.pagination || {},
            catalogos: {
                grados: gradosRes.data.data || [],
                sedes: sedesRes.data.data?.items || [],
                docentes: docentesRes.data.data?.items || [],
            },
            vigencia: vigenciaRes.data.data?.items.find(v => v.activa) || null
        };
    } catch (error) {
        console.error("Error en fetchInitialData (Grupos):", error);
        throw parseError(error, "Error al cargar datos iniciales.");
    }
};

export const crearGrupo = async (data) => {
    try {
        const response = await apiClient.post(GRUPOS_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al crear el grupo");
    }
};

export const actualizarGrupo = async (id, data) => {
    try {
        const response = await apiClient.put(`${GRUPOS_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al actualizar el grupo");
    }
};

export const eliminarGrupo = async (id) => {
    try {
        const response = await apiClient.delete(`${GRUPOS_ENDPOINT}/${id}`);
        return response.data.message;
    } catch (error) {
        throw parseError(error, "Error al eliminar el grupo");
    }
};