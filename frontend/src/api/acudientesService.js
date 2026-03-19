import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";

const ENDPOINT_ACUDIENTES = "/api/acudientes";

/**
 * Listar Acudientes (Buscador)
 * @param {Object} params - { page, limit, busqueda }
 */
export const listarAcudientes = async (params = {}) => {
    try {
        const response = await apiClient.get(ENDPOINT_ACUDIENTES, { params });
        return response.data.data; // Retorna { items: [...], total: ... }
    } catch (error) {
        throw parseError(error, "Error al cargar los acudientes.");
    }
};

/**
 * Buscar un acudiente específico por documento exacto
 * (Usado para el autocompletado del formulario)
 */
export const buscarAcudientePorDocumento = async (documento) => {
    try {
        // Reutilizamos el endpoint de lista filtrando por búsqueda
        const response = await apiClient.get(ENDPOINT_ACUDIENTES, {
            params: { busqueda: documento, limit: 1 }
        });

        const data = response.data.data || response.data;
        const items = data.items || [];

        // Verificamos que sea el documento exacto (para evitar coincidencias parciales)
        return items.find(a => a.documento === documento) || null;
    } catch (error) {
        console.error("Error buscando acudiente por documento:", error);
        // Si falla la búsqueda silenciosa, retornamos null para no bloquear el UI
        return null;
    }
};

/**
 * Crear nuevo Acudiente
 */
export const crearAcudiente = async (data) => {
    try {
        const response = await apiClient.post(ENDPOINT_ACUDIENTES, data);
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al crear el acudiente.");
    }
};

/**
 * Actualizar datos de un Acudiente
 */
export const actualizarAcudiente = async (id, data) => {
    try {
        const response = await apiClient.put(`${ENDPOINT_ACUDIENTES}/${id}`, data);
        return response.data;
    } catch (error) {
        throw parseError(error,"Error al actualizar el acudiente.");
    }
};

/**
 * Eliminar Acudiente
 */
export const eliminarAcudiente = async (id) => {
    try {
        const response = await apiClient.delete(`${ENDPOINT_ACUDIENTES}/${id}`);
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al eliminar el acudiente.");
    }
};

/**
 * Asignar Acudiente (HÍBRIDO)
 * Busca, crea (si no existe) y vincula al estudiante en un solo paso.
 * @param {Object} payload - { estudianteId, afinidad, documento, primerNombre... }
 */
export const asignarAcudiente = async (payload) => {
    try {
        const response = await apiClient.post(`${ENDPOINT_ACUDIENTES}/asignar`, payload);
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al asignar el acudiente al estudiante.");
    }
};

/**
 * Desvincular Acudiente de Estudiante
 * @param {Object} payload - { estudianteId, documento }
 */
export const desvincularAcudiente = async (estudianteId, acudienteId) => {
    try {
        const url = `${ENDPOINT_ACUDIENTES}/desvincular/${estudianteId}/${acudienteId}`;
        const response = await apiClient.delete(url);
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al desvincular el acudiente del estudiante.");
    }
};