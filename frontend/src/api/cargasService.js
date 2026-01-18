import apiClient from "./apiClient.js";

const CARGAS_ENDPOINT = '/api/cargas';

/**
 * Obtiene las cargas con filtros avanzados
 * @param {Object} params - { page, limit, busqueda, sedeId, gradoId, jornada }
 */
export const fetchCargas = async (params = {}) => {
    try {
        // Limpiamos parámetros vacíos/nulos para no ensuciar la URL
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v != null && v !== "")
        );

        const queryParams = new URLSearchParams(cleanParams).toString();
        const response = await apiClient.get(`${CARGAS_ENDPOINT}?${queryParams}`);

        return response.data.data; // { items, total, page, limit }
    } catch {
        throw new Error("Error al cargar el listado de cargas académicas.");
    }
};

/**
 * Obtiene los datos necesarios para llenar los FILTROS y FORMULARIOS
 * (Sedes, Grados, Asignaturas, Docentes)
 * Nota: Para los filtros de la tabla solo necesitamos Sedes y Grados.
 */
export const fetchCargasCatalogs = async () => {
    try {
        // Hacemos peticiones en paralelo
        const [sedesRes, gradosRes, asignaturasRes, docentesRes] = await Promise.all([
            apiClient.get('/api/sedes'),
            apiClient.get('/api/grados?limit=100'),
            apiClient.get('/api/asignaturas?limit=200'),
            apiClient.get('/api/docentes?activo=true&limit=200') // Solo docentes activos
        ]);

        return {
            sedes: sedesRes.data.data.items || sedesRes.data.data || [],
            grados: gradosRes.data.data || [],
            asignaturas: asignaturasRes.data.data.items || sedesRes.data.data || [],
            docentes: docentesRes.data.data.items || []
        };
    } catch (error) {
        console.error("Error cargando catálogos", error);
        throw new Error("No se pudieron cargar los datos auxiliares (Sedes/Grados).");
    }
};

export const crearCarga = async (data) => {
    try {
        const response = await apiClient.post(CARGAS_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        handleError(error, "Error al crear la carga");
    }
};

export const actualizarCarga = async (id, data) => {
    try {
        const response = await apiClient.put(`${CARGAS_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        handleError(error, "Error al actualizar la carga");
    }
};

export const eliminarCarga = async (id) => {
    try {
        const response = await apiClient.delete(`${CARGAS_ENDPOINT}/${id}`);
        return response.data.message;
    } catch (error) {
        handleError(error, "Error al eliminar la carga");
    }
};

// Helper de errores estándar
const handleError = (error, actionMessage) => {
    const data = error.response?.data;
    if (data?.message) throw new Error(data.message);
    throw new Error(`${actionMessage}: ${error.message}`);
};

/**
 * Función auxiliar para Buscar grupos filtrados por sede y grado
 */
export const fetchGruposFiltrados = async (sedeId, gradoId) => {
    try {
        if (!sedeId) return [];
        // Construimos query param
        let url = `/api/grupos?sedeId=${sedeId}`;
        if (gradoId) url += `&gradoId=${gradoId}`;

        const response = await apiClient.get(url);
        return response.data.data.items || response.data.data || [];
    } catch (error) {
        console.error("Error buscando grupos", error);
        return [];
    }
};