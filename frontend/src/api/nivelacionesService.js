import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";
import { formatearJornada } from "../utils/formatters.js";

const NIVELACIONES_ENDPOINT = '/api/nivelaciones';
const MIS_CARGAS_ENDPOINT = '/api/cargas/mis-cargas';
const GRUPOS_ENDPOINT = '/api/grupos';
const AREAS_ENDPOINT = '/api/areas';
const SEDES_ENDPOINT = '/api/sedes';
const VIGENCIAS_ENDPOINT = '/api/vigencias';

const formatGrado = (nombre) => {
    if (!nombre) return "";
    return nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase().replace(/_/g, " ");
};

/**
 * Carga los catálogos INTELIGENTES para Nivelaciones según el ROL.
 * - Docente: Trae solo su carga y extrae las Áreas de sus asignaturas.
 * - Admin/Coordinador: Trae todo el catálogo global.
 */
export const fetchNivelacionCatalogs = async (rol) => {
    try {
        // 1. Obtener la vigencia activa
        const vigenciasResponse = await apiClient.get(VIGENCIAS_ENDPOINT);
        const vigenciasItems = vigenciasResponse.data?.data?.items || [];
        const vigenciaActiva = vigenciasItems.find(v => v.activa === true);

        if (!vigenciaActiva) throw new Error("No se encontró una vigencia activa.");

        const esAdmin = ['admin', 'secretaria', 'coordinador'].includes(rol);

        let sedes = [];
        let grupos = [];
        let areas = [];
        let cargaCompleta = []; // Cascada exclusiva de docentes

        if (esAdmin) {
            // --- MODO ADMINISTRATIVO ---
            const [sedesRes, gruposRes, areasRes] = await Promise.all([
                apiClient.get(SEDES_ENDPOINT),
                apiClient.get(`${GRUPOS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}&limit=200`),
                apiClient.get(`${AREAS_ENDPOINT}?limit=100&activo=true`)
            ]);

            sedes = sedesRes.data?.data?.items || sedesRes.data?.data || [];

            const rawGrupos = gruposRes.data?.data?.items || gruposRes.data?.data || [];
            grupos = rawGrupos.map(g => ({
                id: g.id,
                sedeId: g.sedeId,
                label: `${formatGrado(g.grado?.nombre)} ${g.nombre} | ${formatearJornada(g.jornada)}`
            }));

            areas = areasRes.data?.data?.items || areasRes.data?.data || [];
        } else {
            // --- MODO DOCENTE ---
            const cargaResponse = await apiClient.get(MIS_CARGAS_ENDPOINT);
            const itemsCarga = cargaResponse.data?.data?.items || cargaResponse.data?.data || [];

            // Extraer Sedes Únicas de la carga
            const sedesMap = new Map();
            itemsCarga.forEach(item => {
                if (item.sede && !sedesMap.has(item.sede.id)) {
                    sedesMap.set(item.sede.id, item.sede);
                }
            });
            sedes = Array.from(sedesMap.values());

            // Extraer Grupos Únicos vinculados a su sede con formato descriptivo
            const gruposMap = new Map();
            itemsCarga.forEach(item => {
                const g = item.grupo;
                if (g && !gruposMap.has(g.id)) {
                    gruposMap.set(g.id, {
                        id: g.id,
                        sedeId: item.sedeId,
                        label: `${formatGrado(g.grado?.nombre)} ${g.nombre} | ${formatearJornada(g.jornada)}`
                    });
                }
            });
            grupos = Array.from(gruposMap.values());

            cargaCompleta = itemsCarga;
        }

        return {
            vigencia: vigenciaActiva,
            vigencias: vigenciasItems,
            sedes,
            grupos,
            areas,          // Solo para Admins
            cargaCompleta,  // Solo para Docentes
            esAdmin
        };
    } catch (error) {
        console.error('Error en fetchNivelacionCatalogs:', error);
        throw parseError(error, "No se pudieron cargar los filtros de nivelación.");
    }
};

export const fetchPendientesNivelacion = async (grupoId, vigenciaId) => {
    try {
        if (!grupoId) return [];

        let url = `${NIVELACIONES_ENDPOINT}/pendientes?grupoId=${grupoId}`;
        // Si el frontend envía un año lectivo diferente, lo sumamos a la petición
        if (vigenciaId) {
            url += `&vigenciaId=${vigenciaId}`;
        }
        const response = await apiClient.get(url);
        return response.data.data || response.data;
    } catch (error) {
        throw parseError(error, "Error al cargar la lista de estudiantes para nivelación.");
    }
};

export const registrarNivelacion = async (matriculaId, areaId, formData) => {
    try {
        const response = await apiClient.put(`${NIVELACIONES_ENDPOINT}/${matriculaId}/${areaId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al registrar la nivelación.");
    }
};

export const fetchReprobadosDirectos = async (grupoId, vigenciaId) => {
    try {
        if (!grupoId) return [];

        let url = `${NIVELACIONES_ENDPOINT}/reprobados-directos?grupoId=${grupoId}`;
        // Hacemos lo mismo para el listado de reprobados directos
        if (vigenciaId) {
            url += `&vigenciaId=${vigenciaId}`;
        }

        const response = await apiClient.get(url);
        return response.data.data || response.data;
    } catch (error) {
        throw parseError(error, "Error al cargar la lista de reprobados directos.");
    }
};

export const guardarCalificacionesMasivas = async (arregloNotas) => {
    try {
        const response = await apiClient.post(`${NIVELACIONES_ENDPOINT}/completar-notas-faltantes`, { notas: arregloNotas });
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al procesar el guardado masivo de calificaciones pendientes.");
    }
};

/**
 * Consume el endpoint binario para compilar y descargar el Acta de Nivelación en PDF
 */
export const descargarActaNivelacionPdf = async (grupoId, areaId) => {
    try {
        const response = await apiClient.get(`${NIVELACIONES_ENDPOINT}/acta-pdf`, {
            params: { grupoId, areaId },
            responseType: 'blob' // Esencial para la lectura correcta del buffer binario
        });
        return response.data;
    } catch (error) {
        throw parseError(error, "No se pudo descargar el acta de nivelación oficial.");
    }
};