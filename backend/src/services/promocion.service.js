import { sequelize } from "../database/db.connect.js";
import { gradoRepository } from "../repositories/grado.repository.js";
import { vigenciaRepository } from "../repositories/vigencia.repository.js";
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

            const nombreGrado = (gradoActual.nombre || '').toUpperCase();
            const esCicloV = nombreGrado.includes('CICLO_V') || nombreGrado.includes('CICLO V');
            const periodoCierre = esCicloV ? 3 : 5;

            // 2. Traer la vigencia siguiente para grados regulares
            let vigenciaSiguienteId = null;
            if (!esCicloV) {
                const vigenciaSiguiente = await vigenciaRepository.findVigenciaSiguiente(vigenciaId);
                vigenciaSiguienteId = vigenciaSiguiente ? vigenciaSiguiente.id : null;
            }

            // 3. Obtener las matrículas activas del grupo
            const matriculas = await matriculaRepository.findByGrupoForPromocion(grupoId, vigenciaId);
            const matriculasFiltradas = matriculas.filter(m => !m.bloqueo_notas); // Omitimos bloqueos si es necesario, o procesamos todo el grupo

            if (matriculasFiltradas.length === 0) return [];

            const matriculasIds = matriculasFiltradas.map(m => m.id);

            // 4. Cargar consolidados y nivelaciones desde los repositorios
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

            // 5. Generar la simulación estudiante por estudiante
            const simulacion = matriculasFiltradas.map(matricula => {
                const areas = mapaConsolidados[matricula.id] || [];
                const nivs = mapaNivelaciones[matricula.id] || [];

                const nombreEstudiante = `${matricula.estudiante?.primerApellido || ''} ${matricula.estudiante?.segundoApellido || ''} ${matricula.estudiante?.primerNombre || ''} ${matricula.estudiante?.segundoNombre || ''}`.trim();

                // Filtrar áreas reprobadas (ignorando Comportamiento/Disciplina)
                const areasReprobadas = areas.filter(a => {
                    const nombreArea = (a.area?.nombre || '').toUpperCase();
                    return a.estadoFinal === 'REPROBADO' && nombreArea !== 'COMPORTAMIENTO' && nombreArea !== 'DISCIPLINA';
                });

                let dictamenSugerido = "PROMOVIDO";

                // --- EVALUACIÓN DE REGLAS ---
                if (areasReprobadas.length >= 3) {
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

                // --- DETERMINAR GRADO Y VIGENCIA DESTINO ---
                let gradoDestinoId = null;
                let vigenciaDestinoId = null;
                let esGraduando = false;

                if (dictamenSugerido === "PROMOVIDO") {
                    if (!gradoActual.gradoSiguienteId) {
                        esGraduando = true; // Caso ONCE o CICLO_VI (gradoSiguienteId es NULL)
                    } else {
                        gradoDestinoId = gradoActual.gradoSiguienteId;
                        vigenciaDestinoId = esCicloV ? vigenciaId : vigenciaSiguienteId;
                    }
                } else if (dictamenSugerido === "REPROBADO") {
                    gradoDestinoId = gradoId; // Repite el mismo grado
                    vigenciaDestinoId = esCicloV ? null : vigenciaSiguienteId; // Si es Ciclo V reprobado, espera hasta el próximo año (vigencia siguiente)
                }

                return {
                    matriculaId: matricula.id,
                    estudianteId: matricula.estudianteId,
                    metodologia: matricula.metodologia,
                    nombreEstudiante,
                    documento: matricula.estudiante?.documento || 'N/A',
                    estadoActual: matricula.estado,
                    areasPerdidas: areasReprobadas.length,
                    dictamenSugerido, // "PROMOVIDO", "REPROBADO", "PENDIENTE"
                    gradoDestinoSugeridoId: gradoDestinoId,
                    vigenciaDestinoSugeridaId: vigenciaDestinoId,
                    letraGrupoActual: matricula.grupo?.letra || '',
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
            const prematriculasDestino = [];
            const actualizacionesActuales = [];

            const generarFolio = (anio) => `MAT-${anio}-${Math.floor(10000 + Math.random() * 90000)}`;

            // Extraer los IDs únicos de las vigencias destino que vienen en la lista
            const idsVigencias = [...new Set(listaAprobada.map(item => item.vigenciaDestinoId).filter(id => id))];

            // Buscar esas vigencias en la base de datos
            const vigenciasDB = await vigenciaRepository.findVigenciasByIds(idsVigencias, t);

            // Crear un mapa rápido { id_vigencia: "2026", id_otra_vigencia: "2027" }
            const mapaAniosVigencias = {};
            vigenciasDB.forEach(v => {
                mapaAniosVigencias[v.id] = v.anio;
            });

            for (const item of listaAprobada) {
                // 1. Si el estudiante quedó "PENDIENTE" en el simulador, el frontend NO lo envía en esta lista,
                // o lo envía marcado para ser ignorado. Solo procesamos PROMOVIDOS y REPROBADOS.
                if (item.estadoFinal === "PENDIENTE") continue;

                // 2. Acumulamos el cierre de la matrícula actual
                actualizacionesActuales.push({
                    id: item.matriculaViejaId,
                    estado: item.estadoFinal, // "PROMOVIDO" o "REPROBADO"
                    usuarioId: usuarioId
                });

                // 3. Si tiene un grado y vigencia destino, le creamos la nueva matrícula
                // (Los egresados/graduados vendrán con gradoDestinoId = null y no se les crea matrícula)
                if (item.gradoDestinoId && item.vigenciaDestinoId) {

                    const anioExactoFolio = mapaAniosVigencias[item.vigenciaDestinoId] || "0000"; // Obtenemos el año exacto desde el diccionario

                    prematriculasDestino.push({
                        folio: generarFolio(anioExactoFolio),
                        estado: "PREMATRICULADO",
                        metodologia: item.metodologia,
                        es_nuevo: false,
                        es_repitente: item.estadoFinal === "REPROBADO",
                        situacion_ano_anterior: item.estadoFinal === "PROMOVIDO" ? "APROBO" : "REPROBO",
                        bloqueo_notas: false,
                        estudianteId: item.estudianteId,
                        grupoId: item.grupoDestinoId, // Recibimos la acción manual del administrador
                        sedeId: item.sedeId,
                        gradoId: item.gradoDestinoId,
                        vigenciaId: item.vigenciaDestinoId,
                        usuarioCreacion: usuarioId
                    });
                }
            }

            // 4. Inserción masiva usando el repositorio
            if (prematriculasDestino.length > 0) {
                await matriculaRepository.createBulk(prematriculasDestino, { transaction: t });
            }

            if (actualizacionesActuales.length > 0) {
                await matriculaRepository.actualizarEstadosMatriculas(actualizacionesActuales, { transaction: t });
            }

            await t.commit();

            return {
                status: 'success',
                procesados: prematriculasDestino.length,
                mensaje: `Promoción ejecutada exitosamente. Se generaron ${prematriculasDestino.length} prematrículas y se cerraron ${actualizacionesActuales.length} matrículas actuales.`
            };

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    }
};