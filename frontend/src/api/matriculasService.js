import apiClient from "./apiClient.js";

const MATRICULAS_ENDPOINT = "/api/matriculas";

/**
 * Listar Matrículas
 * Obtiene el listado paginado con filtros avanzados.
 * @param {Object} params - Filtros de búsqueda
 * @param {number} [params.page=1] - Página actual
 * @param {number} [params.limit=20] - Registros por página
 * @param {string} [params.busqueda] - Texto para buscar por nombre o documento
 * @param {number} [params.sedeId] - ID de la sede
 * @param {number} [params.grupoId] - ID del grupo
 * @param {number} [params.gradoId] - ID del grado (para filtrar grupos por grado)
 * @param {string} [params.estado] - "ACTIVA", "PREMATRICULADO", "RETIRADO", etc.
 */
export const listarMatriculas = async (params = {}) => {
    try {
        const response = await apiClient.get(MATRICULAS_ENDPOINT, { params });
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Obtener Matrícula
 * Busca una matrícula por ID incluyendo relaciones (Estudiante, Grupo, Sede).
 * @param {number|string} id - ID de la matrícula
 */
export const obtenerMatricula = async (id) => {
    try {
        const response = await apiClient.get(`${MATRICULAS_ENDPOINT}/${id}`);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Crear Matrícula
 * Registra una nueva matrícula individual.
 * @param {Object} data
 * @param {number} data.estudianteId
 * @param {number} data.grupoId
 * @param {number} data.sedeId
 * @param {string} [data.estado] - Opcional.
 * @param {string} [data.observaciones] - Opcional.
 * @param {string} [data.metodologia] - Opcional.
 */
export const crearMatricula = async (data) => {
    try {
        const response = await apiClient.post(MATRICULAS_ENDPOINT, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Actualizar Matrícula
 * Gestiona cambios de estado, traslados de grupo o retiros.
 * @param {number|string} id
 * @param {Object} data - Campos a modificar
 */
export const actualizarMatricula = async (id, data) => {
    try {
        const response = await apiClient.put(`${MATRICULAS_ENDPOINT}/${id}`, data);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Matrícula Masiva (Promoción / Prematrícula)
 * Procesa un lote de estudiantes hacia un grupo destino.
 * @param {Object} payload
 * @param {number[]} payload.estudiantesIds - Array de IDs
 * @param {number} payload.grupoDestinoId
 * @param {number} payload.sedeId
 */
export const crearMatriculaMasiva = async (payload) => {
    try {
        const response = await apiClient.post(`${MATRICULAS_ENDPOINT}/masivo`, payload);
        return response.data;
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Helper: Parseo de Errores
 * Extrae el mensaje más relevante de la respuesta del backend.
 * Soporta el formato de 'validationErrorHandler' ({ errors: [...] }).
 */
const parseError = (error) => {
    const apiError = error.response?.data;

    // Si es error de validación (422), devolvemos el primer mensaje específico
    if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        return new Error(apiError.errors[0].message);
    }

    // Si es error lógico (409, 400, 500), devolvemos el mensaje general
    if (apiError?.message) {
        return new Error(apiError.message);
    }

    // Fallback genérico
    return new Error("Ocurrió un error inesperado al procesar la solicitud.");
};