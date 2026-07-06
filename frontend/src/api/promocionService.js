import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";

const NIVELACIONES_ENDPOINT = '/api/nivelaciones';
const PROMOCION_ENDPOINT = '/api/promocion';
const SEDES_ENDPOINT = '/api/sedes';
const GRUPOS_ENDPOINT = '/api/grupos';
const GRADOS_ENDPOINT = '/api/grados';
const VIGENCIAS_ENDPOINT = '/api/vigencias';

/**
 * Carga los catálogos necesarios para el panel de Promoción Masiva
 */
export const fetchPromocionCatalogs = async () => {
    try {
        const [sedesRes, gradosRes, gruposRes, vigenciasRes] = await Promise.all([
            apiClient.get(SEDES_ENDPOINT),
            apiClient.get(`${GRADOS_ENDPOINT}?limit=100`),
            apiClient.get(`${GRUPOS_ENDPOINT}?limit=200`),
            apiClient.get(VIGENCIAS_ENDPOINT)
        ]);

        return {
            sedes: sedesRes.data?.data?.items || sedesRes.data?.data || [],
            grados: gradosRes.data?.data || [],
            grupos: gruposRes.data?.data?.items || gruposRes.data?.data || [],
            vigencias: vigenciasRes.data?.data?.items || vigenciasRes.data?.data || []
        };
    } catch (error) {
        throw parseError(error, "Error cargando los catálogos para promoción.");
    }
};

/**
 * Ejecutar la generación de consolidados (Cierre de Año / Período 5)
 */
export const generarConsolidadoAnual = async (sedeId, gradoId, grupoId, excluidos = []) => {
    try {
        const response = await apiClient.post(`${NIVELACIONES_ENDPOINT}/generar-consolidados`, {
            sedeId: Number(sedeId),
            grupoId: Number(grupoId),
            gradoId: Number(gradoId),
            estudiantesExcluidos: excluidos
        });
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al generar los consolidados del grupo.");
    }
};

/**
 * Ejecutar la Promoción Masiva
 */
export const ejecutarPromocionMasiva = async (payload) => {
    try {
        // Pasamos el payload directamente, ya que trae la estructura { listaAprobada: [...] }
        const response = await apiClient.post(`${PROMOCION_ENDPOINT}/ejecutar`, payload);
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al ejecutar la promoción masiva.");
    }
};

export const verificarConsolidados = async (grupoId) => {
    try {
        const response = await apiClient.get(`${NIVELACIONES_ENDPOINT}/verificar-consolidados?grupoId=${grupoId}`);
        return response.data;
    } catch (error) {
        console.error("Error al verificar consolidados:", error);
        return { consolidadosGenerados: false };
    }
};

export const simularPromocion = async (payload) => {
    try {
        const response = await apiClient.post(`${PROMOCION_ENDPOINT}/simulador`, payload);
        return response.data;
    } catch (error) {
        console.error("Error al simular la promoción:", error);
    }
};