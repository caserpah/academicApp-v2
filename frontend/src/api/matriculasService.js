import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";

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
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al listar las matrículas.");
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
        throw parseError(error, "Error al obtener la matrícula.");
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
        throw parseError(error, "Error al crear la matrícula.");
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
        throw parseError(error, "Error al actualizar la matrícula.");
    }
};

/**
 * Eliminar Matrícula
 * Elimina el registro de la base de datos.
 * @param {number|string} id - ID de la matrícula
 */
export const eliminarMatricula = async (id) => {
    try {
        const response = await apiClient.delete(`${MATRICULAS_ENDPOINT}/${id}`);
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al eliminar la matrícula.");
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
        throw parseError(error, "Error al procesar matrículas masivamente.");
    }
};