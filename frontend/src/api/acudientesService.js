import apiClient from "./apiClient.js";

const ENDPOINT_ACUDIENTES = "/api/acudientes";

/**
 * Listar Acudientes (Buscador)
 * @param {Object} params - { page, limit, busqueda }
 */
export const listarAcudientes = async (params = {}) => {
    try {
        const response = await apiClient.get(ENDPOINT_ACUDIENTES, { params });
        const apiData = response.data;
        return apiData.data || apiData;
    } catch (error) {
        throw parseError(error);
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
 * Asignar Acudiente (HÍBRIDO)
 * Busca, crea (si no existe) y vincula al estudiante en un solo paso.
 * @param {Object} payload - { estudianteId, afinidad, documento, primerNombre... }
 */
export const asignarAcudiente = async (payload) => {
    try {
        const response = await apiClient.post(`${ENDPOINT_ACUDIENTES}/asignar`, payload);
        return response.data;
    } catch (error) {
        throw parseError(error);
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
        throw parseError(error);
    }
};

// Helper de errores
const parseError = (error) => {
    const apiError = error.response?.data;
    if (apiError?.errors && Array.isArray(apiError.errors)) {
        // Retorna el primer mensaje de validación del array
        return new Error(apiError.errors[0].message);
    }
    // Retorna mensaje genérico o el que envíe el backend
    return new Error(apiError?.message || "Ocurrió un error en el servicio de acudientes.");
};