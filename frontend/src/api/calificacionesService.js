import apiClient from './apiClient.js';

/**
 * Servicio de gestión de Calificaciones
 * Centraliza la lógica de consumo de datos y reglas de negocio del frontend.
 */

const CALIFICACIONES_ENDPOINT = '/api/calificaciones';
const MIS_CARGAS_ENDPOINT = '/api/cargas/mis-cargas'; // Endpoint exclusivo Docentes
const GRUPOS_ENDPOINT = '/api/grupos';                // Endpoint General (Admins)
const ASIGNATURAS_ENDPOINT = '/api/asignaturas';      // Endpoint General (Admins)
const SEDES_ENDPOINT = '/api/sedes';                 // Endpoint General (Admins)
const VIGENCIAS_ENDPOINT = '/api/vigencias';
const RECOMENDACIONES_ENDPOINT = '/api/recomendaciones'

/* Helper: Formatear Jornada */
const formatJornada = (jornadaEnum) => {
    const map = {
        'MANANA': 'Mañana',
        'TARDE': 'Tarde',
        'NOCHE': 'Noche',
        'COMPLETA': 'Completa',
        'UNICA': 'Única'
    };
    return map[jornadaEnum] || jornadaEnum;
};

/* Helper: Formatear Grado (Capitalizar) */
const formatGrado = (nombre) => {
    if (!nombre) return "";
    return nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase().replace(/_/g, " ");
};

/* ------------------------------------------------ */
/* Helper para manejo de errores                    */
/* ------------------------------------------------ */
const parseError = (error) => {
    const apiError = error.response?.data;
    if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        const firstError = apiError.errors[0];
        return new Error(firstError.message || firstError);
    }
    return new Error(apiError?.message || error.message || "Ocurrió un error en el servicio.");
};

/* -------------------------------------------------------------------------- */
/* Funciones principales                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Carga los catálogos INTELIGENTES según el ROL.
 * - Si es Docente: Trae solo su carga académica (Cascada).
 * - Si es Admin: Trae todos los grupos y asignaturas del colegio.
 * * @param {string} rol - El rol del usuario ('docente', 'admin', 'secretaria', etc.)
 */
export const fetchCalificacionesCatalogs = async (rol) => {
    try {
        // Obtener vigencia activa
        const vigenciasResponse = await apiClient.get(VIGENCIAS_ENDPOINT);
        const vigenciasItems = vigenciasResponse.data?.data?.items || [];
        const vigenciaActiva = vigenciasItems.find(v => v.activa === true);

        if (!vigenciaActiva) throw new Error("No se encontró una vigencia activa.");

        const esAdmin = ['admin', 'secretaria', 'coordinador'].includes(rol);

        let sedes = [];
        let grupos = [];
        let asignaturas = [];
        let cargaCompleta = []; // Solo para docentes (para la cascada)

        if (esAdmin) {
            // --- ROLES: ADMIN / SECRETARIA (Ven TODO) ---
            // Cargamos todos los grupos y todas las asignaturas de la vigencia
            const [sedesRes, gruposRes, asigRes] = await Promise.all([
                apiClient.get(SEDES_ENDPOINT),
                apiClient.get(`${GRUPOS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}&limit=200`),
                apiClient.get(`${ASIGNATURAS_ENDPOINT}?vigenciaId=${vigenciaActiva.id}&limit=200&activo=true`)
            ]);

            sedes = sedesRes.data?.data?.items || sedesRes.data?.data || [];

            // Procesamos grupos para el Admin también
            const rawGrupos = gruposRes.data?.data?.items || gruposRes.data?.data || [];
            grupos = rawGrupos.map(g => ({
                id: g.id,
                sedeId: g.sedeId, // Importante para el filtro
                // Formato: "Sexto A | Mañana"
                label: `${formatGrado(g.grado?.nombre)} ${g.nombre} | ${formatJornada(g.jornada)}`,
                gradoId: g.gradoId // Útil para filtrar asignaturas si quisieras
            }));

            asignaturas = asigRes.data?.data?.items || asigRes.data?.data || [];

        } else {
            // --- ROL: DOCENTE (Ve solo lo SUYO) ---
            // Llamamos al endpoint en el backend (carga.controller) que filtra por usuario logueado
            const cargaResponse = await apiClient.get(MIS_CARGAS_ENDPOINT);
            const itemsCarga = cargaResponse.data?.data?.items || cargaResponse.data?.data || [];

            // Extraer Sedes Únicas donde el docente tiene carga
            const sedesMap = new Map();
            itemsCarga.forEach(item => {
                if (item.sede && !sedesMap.has(item.sede.id)) {
                    sedesMap.set(item.sede.id, item.sede);
                }
            });
            sedes = Array.from(sedesMap.values());

            // Extraer Grupos Únicos con Nombre Formateado y Vinculados a Sede
            const gruposMap = new Map();
            itemsCarga.forEach(item => {
                const g = item.grupo;
                if (g && !gruposMap.has(g.id)) {
                    gruposMap.set(g.id, {
                        id: g.id,
                        sedeId: item.sedeId, // Vinculamos grupo a la sede de la carga
                        label: `${formatGrado(g.grado?.nombre)} ${g.nombre} | ${formatJornada(g.jornada)}`
                    });
                }
            });
            grupos = Array.from(gruposMap.values());

            cargaCompleta = itemsCarga;
        }

        return {
            vigencia: vigenciaActiva,
            sedes,               // Lista de sedes (filtrada o total)
            grupos,              // Lista de grupos
            asignaturas,         // Solo Admins
            cargaCompleta,       // Solo Docentes
            esAdmin              // Flag para que el frontend sepa qué lógica aplicar en cascada
        };

    } catch (error) {
        console.error('Error en fetchCalificacionesCatalogs:', error);
        throw parseError(error);
    }
};

/**
 * Obtiene la Grilla de Calificaciones (Estudiantes + Notas)
 * @param {Object} params - { grupoId, asignaturaId, periodo, vigenciaId }
 */
export const fetchGrillaCalificaciones = async (params) => {
    try {
        if (!params.grupoId || !params.asignaturaId || !params.periodo) return [];

        const response = await apiClient.get(`${CALIFICACIONES_ENDPOINT}/grupo`, { params });
        return response.data.data || [];
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Guardar o Actualizar una calificación (Upsert)
 */
export const guardarCalificacion = async (data) => {
    try {
        const response = await apiClient.post(CALIFICACIONES_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error);
    }
};

/**
 * Función para traer recomendaciones
 */
export const fetchBancoRecomendaciones = async () => {
    try {
        const response = await apiClient.get(`${RECOMENDACIONES_ENDPOINT}&limit=200`);
        return response.data.data || [];
    } catch (error) {
        console.error("Error cargando banco de recomendaciones:", error);
        return []; // Retorna vacío si falla para no romper la UI
    }
};