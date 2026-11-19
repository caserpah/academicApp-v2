import { sequelize } from "../database/db.connect.js";
import { gradoRepository } from "../repositories/grado.repository.js";
import { matriculaRepository } from "../repositories/matricula.repository.js";
import { calificacionRepository } from "../repositories/calificacion.repository.js";
import { nivelacionRepository } from "../repositories/nivelacion.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

export const promocionService = {

    /**
     * PASO 1: SIMULADOR DE PROMOCIÓN
     * Lee notas y reglas, y devuelve la sugerencia de promoción. No guarda nada.
     */
    async simularPromocion({ sedeId, gradoId, grupoId, vigenciaId }) {
        try {
            // 1. Obtener datos del grado actual
            const { grado: gradoActual } = await gradoRepository.findGradoYConfiguracion(gradoId);
            if (!gradoActual) throw new Error("No se encontró el grado seleccionado.");

            const codigoGrado = (gradoActual.codigo || '').trim().toUpperCase();
            const periodoCierre = codigoGrado === 'C5' ? 3 : 5;

            // 2. Obtener las matrículas activas del grupo
            const matriculas = await matriculaRepository.findByGrupoForPromocion(grupoId, vigenciaId);
            const matriculasFiltradas = matriculas.filter(m => !m.bloqueo_notas); // Omitimos bloqueos si es necesario, o procesamos todo el grupo

            if (matriculasFiltradas.length === 0) return [];
            const matriculasIds = matriculasFiltradas.map(m => m.id);

            // 3. Cargar consolidados y nivelaciones desde los repositorios
            const consolidados = await calificacionRepository.findConsolidadosPorMatriculas(matriculasIds, periodoCierre);
            const nivelaciones = await nivelacionRepository.findNivelacionesPorMatriculas(matriculasIds, vigenciaId);

            // Mapeo en memoria para acceso rápido
            const mapaConsolidados = {};
            consolidados.forEach(c => {
                if (!mapaConsolidados[c.matriculaId]) mapaConsolidados[c.matriculaId] = [];
                mapaConsolidados[c.matriculaId].push(c);
            });

            const mapaNivelaciones = {};
            nivelaciones.forEach(n => {
                if (!mapaNivelaciones[n.matriculaId]) mapaNivelaciones[n.matriculaId] = [];
                mapaNivelaciones[n.matriculaId].push(n);
            });

            // 4. Generar la simulación estudiante por estudiante
            const simulacion = matriculasFiltradas.map(matricula => {
                const areas = mapaConsolidados[matricula.id] || [];
                const nivs = mapaNivelaciones[matricula.id] || [];
                const nombreEstudiante = `${matricula.estudiante?.primerApellido || ''} ${matricula.estudiante?.segundoApellido || ''} ${matricula.estudiante?.primerNombre || ''} ${matricula.estudiante?.segundoNombre || ''}`.trim();

                let dictamenSugerido = "PROMOVIDO";
                const fuePospuesto = areas.some(a => a.estadoFinal === 'POSPUESTO'); // Revisamos si el estudiante fue marcado como Pospuesto en el consolidado general

                // Filtrar áreas reprobadas (ignorando Comportamiento/Disciplina)
                const areasReprobadas = areas.filter(a => {
                    const nombreArea = (a.area?.nombre || '').toUpperCase();
                    return a.estadoFinal === 'REPROBADO' && nombreArea !== 'COMPORTAMIENTO' && nombreArea !== 'DISCIPLINA';
                });

                // --- DETERMINAR DICTAMEN SUGERIDO ---
                if (areas.length === 0 || fuePospuesto) {
                    dictamenSugerido = "POSPUESTO";
                } else if (areasReprobadas.length >= 3) {
                    dictamenSugerido = "REPROBADO";
                } else if (areasReprobadas.length > 0) {
                    const tienePendientes = nivs.some(n => n.estadoFinal === 'PENDIENTE');
                    const tieneReprobadas = nivs.some(n => n.estadoFinal === 'REPROBADO');

                    if (tienePendientes || nivs.length < areasReprobadas.length) {
                        dictamenSugerido = "PENDIENTE";
                    } else if (tieneReprobadas) {
                        dictamenSugerido = "REPROBADO";
                    } else {
                        dictamenSugerido = "PROMOVIDO";
                    }
                }

                // --- DETERMINAR SI ES EGRESADO ---
                let esGraduando = false;
                if (dictamenSugerido === "PROMOVIDO" && !gradoActual.gradoSiguienteId) {
                    esGraduando = true; // Caso ONCE o CICLO_VI
                }

                return {
                    matriculaId: matricula.id,
                    estudianteId: matricula.estudianteId,
                    nombreEstudiante,
                    documento: matricula.estudiante?.documento || 'N/A',
                    areasPerdidas: areas.length === 0 ? 0 : areasReprobadas.length,
                    dictamenSugerido, // "PROMOVIDO", "REPROBADO", "PENDIENTE", "POSPUESTO"
                    esGraduando
                };
            });

            return simulacion;

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * PASO 2: EJECUTOR DE PROMOCIÓN ANUAL
     * Recibe la lista definitiva desde el frontend (incluyendo los grupos destino seleccionados a mano)
     * y ejecuta los cambios físicos en la base de datos.
     */
    async ejecutarPromocionMasiva(listaAprobada, usuarioId) {
        const t = await sequelize.transaction();

        try {
            const actualizacionesActuales = [];

            for (const item of listaAprobada) {
                // 1. Omitimos los estudiantes que quedaron pendientes o pospuestos, ya que no se les hace ningún cambio
                if (item.estadoFinal === "PENDIENTE" || item.estadoFinal === "POSPUESTO") continue;

                // 2. Acumulamos el cierre de la matrícula actual
                actualizacionesActuales.push({
                    id: item.matriculaId,
                    estado: item.estadoFinal, // "PROMOVIDO" o "REPROBADO"
                    usuarioId: usuarioId
                });
            }

            // 3. Actualizamos las matrículas actuales en bloque
            if (actualizacionesActuales.length > 0) {
                await matriculaRepository.actualizarEstadosMatriculas(actualizacionesActuales, { transaction: t });
            }

            await t.commit();

            return {
                status: 'success',
                procesados: actualizacionesActuales.length,
                mensaje: `Cierre de año oficializado exitosamente. Se sellaron los dictámenes de ${actualizacionesActuales.length} estudiantes.`
            };

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * Verifica la cantidad de estudiantes con matrícula "ACTIVA" en un grupo.
     */
    async verificarMatriculasActivas({ grupoId, vigenciaId }) {
        try {
            const cantidad = await matriculaRepository.countActivasPorGrupo(grupoId, vigenciaId);
            return {
                hayActivos: cantidad > 0,
                cantidad: cantidad
            };
        } catch (error) {
            throw handleSequelizeError(error);
        }
    }
};