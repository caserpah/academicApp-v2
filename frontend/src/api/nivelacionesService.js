import apiClient from './apiClient.js';

const NIVELACIONES_ENDPOINT = '/api/nivelaciones';

/* Helper: Manejo de errores (Idéntico al de calificaciones) */
const parseError = (error) => {
    const apiError = error.response?.data;
    let finalError;

    if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        const firstError = apiError.errors[0];
        finalError = new Error(firstError.message || firstError);
    } else {
        finalError = new Error(apiError?.message || error.message || "Ocurrió un error en el servicio.");
    }
    if (apiError?.code) finalError.code = apiError.code;

    return finalError;
};

/**
 * Obtiene la lista de estudiantes reprobados (pendientes de nivelar)
 * @param {Object} params - { grupoId, asignaturaId }
 */
export const fetchPendientesNivelacion = async (params) => {
    try {
        if (!params.grupoId || !params.asignaturaId) return [];
        const response = await apiClient.get(`${NIVELACIONES_ENDPOINT}/pendientes`, { params });
        return response.data.data || [];
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Guarda la nota de nivelación y el acta/evidencia física (Upsert/Update)
 * @param {string|number} matriculaId
 * @param {string|number} asignaturaId
 * @param {Object} data - { notaNivelacion, observacion_nivelacion, evidencia (File) }
 */
export const guardarNivelacion = async (matriculaId, asignaturaId, data) => {
    try {
        let payload = data;
        let config = {};

        // Verificamos si hay un archivo adjunto
        if (data.evidencia && data.evidencia instanceof File) {
            const formData = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== null && data[key] !== undefined) {
                    formData.append(key, data[key]);
                }
            });
            payload = formData;
            config = { headers: { 'Content-Type': 'multipart/form-data' } };
        }

        const response = await apiClient.put(`${NIVELACIONES_ENDPOINT}/${matriculaId}/${asignaturaId}`, payload, config);
        return response.data.data;
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * PROCESO ADMINISTRATIVO: Cierre de Año
 * Calcula promedios y llena la tabla de nivelaciones.
 * @param {Object} payload - { sedeId, gradoId, grupoId }
 */
export const generarConsolidadosMasivos = async (payload) => {
    try {
        const response = await apiClient.post(`${NIVELACIONES_ENDPOINT}/generar-consolidados`, payload);
        return response.data; // Retorna { exito, mensaje, data: { procesados... } }
    } catch (error) {
        throw parseError(error);
    }
};