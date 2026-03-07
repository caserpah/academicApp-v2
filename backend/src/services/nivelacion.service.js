import { sequelize } from "../database/db.connect.js";
import { nivelacionRepository } from "../repositories/nivelacion.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { calificacionRepository } from "../repositories/calificacion.repository.js";
import { ConfigGrado } from "../models/config_grado.js";
import { Carga } from "../models/carga.js";
import { Asignatura } from "../models/asignatura.js";
import { Docente } from "../models/docente.js";

export const nivelacionService = {
    /**
     * Registra o actualiza la nota de nivelación de un estudiante en una asignatura.
     * Aplica la regla de negocio del 3.0 legal y maneja la evidencia.
     */
    async registrarNivelacion(matriculaId, asignaturaId, payload, fileUrl, docenteId) {
        try {
            // 1. Buscar el consolidado original para validar que exista y que esté reprobado
            const consolidado = await nivelacionRepository.findByMatriculaYAsignatura(matriculaId, asignaturaId);

            if (!consolidado) {
                const error = new Error("No se encontró el registro consolidado de esta asignatura para el estudiante.");
                error.status = 404;
                throw error;
            }

            // Validación lógica: No se puede nivelar algo ya aprobado
            if (consolidado.estadoOriginal === "APROBADO") {
                const error = new Error("El estudiante ya tiene esta asignatura aprobada. No requiere nivelación.");
                error.status = 400;
                throw error;
            }

            // 2. Extraer y validar la nota ingresada
            const notaNivelacion = parseFloat(payload.notaNivelacion);
            if (Number.isNaN(Number(notaNivelacion)) || notaNivelacion < 0 || notaNivelacion > 5.0) {
                const error = new Error("La nota de nivelación debe ser un número válido dentro de la escala permitida.");
                error.status = 400;
                throw error;
            }

            // 3. APLICAR REGLA DE NEGOCIO (El 3.0 máximo)
            let notaFinalLegal = consolidado.notaDefinitivaOriginal;
            let estadoFinal = "REPROBADO";

            if (notaNivelacion >= 3.0) {
                // CASO A: Pasó la nivelación. Legalmente queda en Básico (3.0)
                notaFinalLegal = 3.0;
                estadoFinal = "NIVELADO";
            } else {
                // CASO B: Perdió la nivelación.
                // La nota final queda siendo la mayor entre la que ya tenía y la que sacó en nivelación.
                notaFinalLegal = Math.max(consolidado.notaDefinitivaOriginal, notaNivelacion);
                estadoFinal = "REPROBADO";
            }

            // 4. Construir objeto de actualización
            const datosActualizacion = {
                notaNivelacion: notaNivelacion,
                notaFinalLegal: notaFinalLegal,
                estadoFinal: estadoFinal,
                fecha_nivelacion: new Date(),
                docenteId: docenteId,
                observacion_nivelacion: payload.observacion_nivelacion || null
            };

            // 5. Inyectar la URL de la evidencia si el middleware subió un archivo
            if (fileUrl) {
                datosActualizacion.url_evidencia_nivelacion = fileUrl;
            }

            // 6. Guardar en base de datos
            return await nivelacionRepository.actualizar(consolidado.id, datosActualizacion);

        } catch (error) {
            if (error.status) throw error;

            throw handleSequelizeError(error);
        }
    },

    /**
     * Obtiene la lista de estudiantes reprobados en una asignatura para un grupo específico.
     * (Alimenta la vista del profesor)
     */
    async obtenerEstudiantesParaNivelar(grupoId, asignaturaId) {
        try {
            return await nivelacionRepository.findReprobadosPorGrupoYAsignatura(grupoId, asignaturaId);
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * GENERADOR DE CONSOLIDADOS ANUALES (Cierre de Año)
     * Calcula la definitiva de cada estudiante en cada asignatura y crea el Acta de Nivelaciones.
     * Con "Check de Vuelo" para auditar notas faltantes de los docentes.
     */
    async generarConsolidadosAnuales({ sedeId, gradoId, grupoId, vigenciaId, forzarCierre = false }) {
        const t = await sequelize.transaction();
        try {
            // 1. Obtener la configuración de periodos y el grado para saber cuántos periodos exiger para el cálculo del 3.0 legal
            //const { ConfigGrado, Carga, Asignatura, Docente } = sequelize.models;
            const config = await ConfigGrado.findOne({ where: { gradoId } });

            if (!config || !config.periodosPermitidos) throw new Error("No hay configuración de periodos para este grado.");

            // Ej: [1, 2, 3, 4] -> totalPeriodosExigidos = 4
            const periodosPermitidos = typeof config.periodosPermitidos === 'string'
                ? JSON.parse(config.periodosPermitidos) : config.periodosPermitidos;
            const totalPeriodosExigidos = periodosPermitidos.length;

            // 2. Obtener los estudiantes activos del grupo
            // Reutilizamos repositorio de calificaciones
            const todasLasMatriculas = await calificacionRepository.findMatriculasPorGrupo(grupoId, vigenciaId);

            // Filtramos y sacamos de la lista a los estudiantes con bloqueo_notas
            const matriculas = todasLasMatriculas.filter(m => !m.bloqueo_notas);

            if (matriculas.length === 0) {
                return { procesados: 0, mensaje: "No hay estudiantes activos en este grupo." };
            }

            // Mapeamos para tener diccionarios rápidos
            const estudiantesIds = matriculas.map(m => m.estudiante.id);
            const mapaMatriculas = {};
            matriculas.forEach(m => mapaMatriculas[m.estudiante.id] = m.id);

            // Extraer: ¿Qué asignaturas se dictan en este grupo y por quién?
            const cargasDelGrupo = await Carga.findAll({
                where: { grupoId, vigenciaId },
                include: [
                    { model: Asignatura, as: 'asignatura', attributes: ['id', 'nombre'] },
                    { model: Docente, as: 'docente', attributes: ['nombre', 'apellidos'] }
                ]
            });

            // Extraer todas las notas (excluyendo COMPORTAMIENTO)
            const notas = await calificacionRepository.findCalificacionesParaConsolidado(
                estudiantesIds, vigenciaId, periodosPermitidos
            );

            // ------------------------------------
            // Auditoría de notas faltantes
            // ------------------------------------
            const reporteFaltantes = [];

            // Diccionario rápido para saber si una nota existe: diccionario[estId][asigId][periodo] = true
            const diccionarioNotas = {};
            notas.forEach(n => {
                if (!diccionarioNotas[n.estudianteId]) diccionarioNotas[n.estudianteId] = {};
                if (!diccionarioNotas[n.estudianteId][n.asignaturaId]) diccionarioNotas[n.estudianteId][n.asignaturaId] = {};
                diccionarioNotas[n.estudianteId][n.asignaturaId][n.periodo] = true;
            });

            // Cruzamos los Estudiantes vs las Cargas (Materias) vs Periodos
            matriculas.forEach(m => {
                cargasDelGrupo.forEach(carga => {
                    if (carga.asignatura.nombre === 'COMPORTAMIENTO') return; // Ignoramos comportamiento

                    // Arreglo temporal para acumular los periodos que le faltan en ESTA materia
                    const periodosFaltantesDeMateria = [];

                    periodosPermitidos.forEach(periodo => {
                        const existeNota = diccionarioNotas[m.estudiante.id]?.[carga.asignatura.id]?.[periodo];

                        if (!existeNota) {
                            periodosFaltantesDeMateria.push(periodo);
                        }
                    });

                    // Si le falta al menos un periodo en esta materia, agregamos UNA sola fila al reporte
                    if (periodosFaltantesDeMateria.length > 0) {
                        reporteFaltantes.push({
                            docente: `${carga.docente?.nombre || ''} ${carga.docente?.apellidos || ''}`.trim() || 'Sin asignar',
                            asignatura: carga.asignatura.nombre,
                            periodos: periodosFaltantesDeMateria.join(", "), // Agrupamos: "1, 2, 3"
                            estudiante: `${m.estudiante.primerNombre} ${m.estudiante.primerApellido}`
                        });
                    }
                });
            });

            // Si hay faltantes y NO han forzado el cierre, detenemos y enviamos la alerta
            if (reporteFaltantes.length > 0 && !forzarCierre) {
                await t.rollback();
                return {
                    status: 'warning',
                    mensaje: `Faltan ${reporteFaltantes.length} calificaciones por ingresar. ¿Desea forzar el cierre y rellenar con 0.0?`,
                    faltantes: reporteFaltantes // Enviamos el detalle al frontend
                };
            }

            // 4. EL CÁLCULO MATEMÁTICO (Agrupar por Estudiante + Asignatura)
            // Estructura: agrupacion[estudianteId][asignaturaId] = { sumaNotas: 4.5, periodosContados: 2 }
            const agrupacion = {};

            notas.forEach(nota => {
                const estId = nota.estudianteId;
                const asigId = nota.asignaturaId;
                const valorNota = parseFloat(nota.notaDefinitiva) || 0;

                if (!agrupacion[estId]) agrupacion[estId] = {};
                if (!agrupacion[estId][asigId]) {
                    agrupacion[estId][asigId] = { suma: 0 };
                }

                agrupacion[estId][asigId].suma += valorNota;
            });

            // 5. PREPARAR EL UPSERT (Los registros a guardar)
            const registrosParaGuardar = [];

            // Iteramos por cada estudiante y sus materias
            for (const estId in agrupacion) {
                const matriculaId = mapaMatriculas[estId];

                for (const asigId in agrupacion[estId]) {
                    const datosMateria = agrupacion[estId][asigId];

                    // REGLA: Dividimos entre el total exigido (No entre los que cursó)
                    // Ej: Sacó 4.0 en el periodo 4, pero faltó a los otros 3. (4.0 / 4 = 1.0)
                    let promedioMatematico = datosMateria.suma / totalPeriodosExigidos;

                    // REGLA DE NEGOCIO: Si el promedio está entre 2.96 y 3.0, se redondea a 3.0
                    if (promedioMatematico >= 2.96 && promedioMatematico < 3.0) {
                        promedioMatematico = 3.0;
                    } else {
                        // Si no entra en gracia, truncamos a 1 decimal (Ej. 2.95 -> 2.9 / 3.48 -> 3.4)
                        promedioMatematico = Math.trunc(promedioMatematico * 10) / 10;
                    }

                    const estado = promedioMatematico >= 3.0 ? "APROBADO" : "REPROBADO";

                    registrosParaGuardar.push({
                        matriculaId: matriculaId,
                        asignaturaId: parseInt(asigId),
                        vigenciaId: vigenciaId,
                        gradoId: gradoId,
                        notaDefinitivaOriginal: promedioMatematico,
                        estadoOriginal: estado,
                        notaFinalLegal: promedioMatematico, // Por defecto es la misma hasta que nivele
                        estadoFinal: estado
                    });
                }
            }

            // 6. GUARDAR EN BASE DE DATOS (Masivo)
            if (registrosParaGuardar.length > 0) {
                await nivelacionRepository.crearMasivo(registrosParaGuardar, t);
            }

            await t.commit();
            return {
                status: 'success',
                procesados: registrosParaGuardar.length,
                mensaje: "Cierre de año ejecutado. Consolidados generados exitosamente."
            };

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    }
};