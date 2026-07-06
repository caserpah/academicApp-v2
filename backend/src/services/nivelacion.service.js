import { sequelize } from "../database/db.connect.js";
import { nivelacionRepository } from "../repositories/nivelacion.repository.js";
import { calificacionRepository } from "../repositories/calificacion.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { PORCENTAJES, DIM, obtenerJuicio, obtenerJucioArea } from "../utils/calificacion.helpers.js";
export const nivelacionService = {
    /**
     * Registra o actualiza la nota de nivelación de un estudiante en una asignatura.
     * Aplica la regla de negocio del 3.0 legal y maneja la evidencia.
     */
    async registrarNivelacion(matriculaId, areaId, payload, fileUrl, usuarioAuditorId) {
        try {
            // 1. Buscar el consolidado original para validar que exista y que esté reprobado
            const consolidado = await nivelacionRepository.findByMatriculaYArea(matriculaId, areaId);
            if (!consolidado) {
                const error = new Error("No se encontró el registro consolidado de esta área para el estudiante.");
                error.status = 404;
                throw error;
            }

            // Validación lógica: No se puede nivelar algo ya aprobado
            if (consolidado.estadoOriginal === "APROBADO") {
                const error = new Error("El estudiante ya tiene esta área aprobada. No requiere nivelación.");
                error.status = 400;
                throw error;
            }

            // 2. Extraer y validar la nota ingresada
            const notaNivelacion = parseFloat(payload.notaNivelacion);
            if (Number.isNaN(Number(notaNivelacion)) || notaNivelacion < 1.0 || notaNivelacion > 5.0) {
                const error = new Error("La nota de nivelación debe ser un número válido dentro de la escala permitida.");
                error.status = 400;
                throw error;
            }

            // 3. Obtener el Docente Oficial a través del repositorio
            const idDocenteOficial = await nivelacionRepository.findDocenteOficialPorArea(matriculaId, areaId);

            // 4. APLICAR REGLA DE NEGOCIO (El 3.0 máximo)
            let notaFinalLegal = consolidado.notaDefinitivaOriginal;
            let estadoFinal = "REPROBADO";

            if (notaNivelacion >= 3.0) {
                notaFinalLegal = 3.0;
                estadoFinal = "NIVELADO";
            } else {
                notaFinalLegal = Math.max(consolidado.notaDefinitivaOriginal, notaNivelacion);
                estadoFinal = "REPROBADO";
            }

            // 4. Construir objeto de actualización
            const datosActualizacion = {
                notaNivelacion: notaNivelacion,
                notaFinalLegal: notaFinalLegal,
                estadoFinal: estadoFinal,
                fecha_nivelacion: new Date(),
                observacion_nivelacion: payload.observacion_nivelacion || null,
                docenteId: idDocenteOficial,
                usuarioId: usuarioAuditorId
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
     * Obtiene la lista de estudiantes reprobados en una área para un grupo específico.
     * (Alimenta la vista del profesor)
     */
    async obtenerEstudiantesParaNivelar(grupoId, docenteId = null, vigenciaId = null) {
        try {
            const nivelaciones = await nivelacionRepository.findReprobadosPorGrupo(grupoId); // Traemos todos los reprobados del grupo

            // Obtener el Set de estudiantes que ya perdieron el año (3 o más)
            let setReprobadosIds = new Set();
            if (vigenciaId) {
                const reprobadosDirectos = await this.obtenerReprobadosDirectos(grupoId, vigenciaId);
                reprobadosDirectos.forEach(r => setReprobadosIds.add(r.matriculaId));
            }

            // Si el docenteId fue proporcionado, filtramos para mostrar solo las áreas de las asignaturas que dicta ese profesor
            let areasPermitidas = null;
            if (docenteId) {
                areasPermitidas = await nivelacionRepository.findAreasPermitidasPorDocente(grupoId, docenteId);
            }

            const resultadoAgrupado = {};

            nivelaciones.forEach(niv => {
                const areaId = niv.areaId;

                // Filtro estricto para docentes: Si no dicta esta área, la ignoramos
                if (areasPermitidas !== null && !areasPermitidas.includes(areaId)) {
                    return;
                }

                const nombreArea = niv.area?.nombre || niv.Area?.nombre || `Área Sin Nombre`;

                if (!resultadoAgrupado[nombreArea]) {
                    resultadoAgrupado[nombreArea] = {
                        areaId: areaId,
                        nombreArea: nombreArea,
                        estudiantes: []
                    };
                }

                // Asegurarnos de que el JSON de detalleAsignaturas sea un objeto
                const detalles = typeof niv.detalleAsignaturas === 'string'
                    ? JSON.parse(niv.detalleAsignaturas)
                    : niv.detalleAsignaturas;

                resultadoAgrupado[nombreArea].estudiantes.push({
                    nivelacionId: niv.id,
                    matriculaId: niv.matriculaId,
                    nombreEstudiante: `${niv.matricula.estudiante.primerApellido} ${niv.matricula.estudiante.segundoApellido || ''} ${niv.matricula.estudiante.primerNombre} ${niv.matricula.estudiante.segundoNombre || ''}`.trim(),
                    notaOriginalArea: niv.notaDefinitivaOriginal,
                    detalleAsignaturas: detalles,
                    pierdeAnio: setReprobadosIds.has(niv.matriculaId),
                    estadoFinal: niv.estadoFinal, // 'PENDIENTE', 'APROBADO' o 'REPROBADO'
                    notaNivelacion: niv.notaNivelacion,
                    observacion: niv.observacion_nivelacion,
                    urlEvidencia: niv.url_evidencia_nivelacion
                });
            });

            // Devolver un Array de Objetos (Áreas) que contienen adentro a los estudiantes
            return Object.values(resultadoAgrupado);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * GENERADOR DE CONSOLIDADOS ANUALES (Cierre de Año)
     * Calcula la definitiva de cada estudiante agrupando por ÁREAS.
     * Genera los registros de Nivelación en estado PENDIENTE para las áreas reprobadas.
     */
    async generarConsolidadosAnuales({ sedeId, gradoId, grupoId, vigenciaId, forzarCierre = false, estudiantesExcluidos = [] }) {
        const t = await sequelize.transaction();
        try {
            // 1. Identificar dinámicamente si es un Grado Semestral o Regular
            const grado = await nivelacionRepository.findGradoById(gradoId);
            if (!grado) throw new Error("No se encontró el grado seleccionado.");

            const nombreGrado = (grado.nombre || '').toUpperCase();
            const esPreescolar = grado.nivelAcademico === 'PREESCOLAR';

            // Detección inteligente de semestres para ciclos
            const esCualquierCiclo = nombreGrado.includes('CICLO') || nombreGrado.includes('CLEI');

            // Los ciclos pares (II, IV, VI) pertenecen al segundo semestre
            const esCicloSemestre2 = nombreGrado.includes('CICLO_II') || nombreGrado.includes('CICLO II') ||
                nombreGrado.includes('CICLO_IV') || nombreGrado.includes('CICLO IV') ||
                nombreGrado.includes('CICLO_VI') || nombreGrado.includes('CICLO VI');

            // Si es un ciclo, pero no es del semestre 2, por descarte es del semestre 1 (I, III, V)
            const esCicloSemestre1 = esCualquierCiclo && !esCicloSemestre2;

            // Cargar rangos de desempeño en caché para los juicios
            const rangosCache = await nivelacionRepository.findRangosDesempeno(vigenciaId);

            // 2. Definir reglas matemáticas de manera blindada
            let periodosPermitidos = [1, 2, 3, 4]; // Por defecto para grados regulares (ej. Sexto, Séptimo)

            if (esCicloSemestre1) {
                periodosPermitidos = [1, 2]; // Ciclo V evalúa periodos 1 y 2
            } else if (esCicloSemestre2) {
                periodosPermitidos = [3, 4]; // Ciclo VI evalúa periodos 3 y 4
            }

            const totalPeriodosExigidos = periodosPermitidos.length; // Será 2 matemáticamente para ciclos
            const periodoDeCierre = esCualquierCiclo ? 3 : 5; // Periodo 3 para todos los ciclos, 5 para regulares

            // 3. Obtener los estudiantes activos del grupo
            const todasLasMatriculas = await calificacionRepository.findMatriculasPorGrupo(grupoId, vigenciaId);

            // Filtramos a los que tienen bloqueo_notas por sistema Y a los excluidos manualmente desde el frontend
            const matriculas = todasLasMatriculas.filter(m =>
                !m.bloqueo_notas &&
                !estudiantesExcluidos.includes(m.estudiante.id)
            );

            if (matriculas.length === 0) {
                return { procesados: 0, mensaje: "No hay estudiantes activos en este grupo." };
            }

            // Mapeamos para tener diccionarios rápidos
            const estudiantesIds = matriculas.map(m => m.estudiante.id);
            const mapaMatriculas = {};
            matriculas.forEach(m => mapaMatriculas[m.estudiante.id] = m.id);

            // Extraer: ¿Qué asignaturas se dictan en este grupo y por quién?
            const cargasDelGrupo = await nivelacionRepository.findCargasConDetalles(grupoId, vigenciaId);

            if (!cargasDelGrupo || cargasDelGrupo.length === 0) {
                await t.rollback();
                return {
                    status: 'warning',
                    mensaje: "Operación cancelada: Este grupo no tiene carga académica (asignaturas y docentes) configurada. Asígnale la carga académica antes de intentar cerrar el año.",
                    faltantes: []
                };
            }

            // Diccionario rápido de la información de las materias
            const infoAsignaturas = {};
            cargasDelGrupo.forEach(c => {
                infoAsignaturas[c.asignatura.id] = {
                    areaId: c.asignatura.areaId,
                    nombre: c.asignatura.nombre,
                    porcentual: c.asignatura.porcentual || 100
                };
            });

            const notas = await calificacionRepository.findCalificacionesParaConsolidado(
                estudiantesIds, vigenciaId, periodosPermitidos
            );

            // =================================================================
            // INYECCIÓN CONTROLADA PARA ASIGNATURAS INSTITUCIONALES (NUEVO BLINDAJE)
            // =================================================================
            // Recupera del lote de calificaciones aquellas materias que no tienen
            // carga horaria tradicional (como Comportamiento) para asegurar su
            // procesamiento en el promedio y su registro final en la BD.
            notas.forEach(n => {
                if (!infoAsignaturas[n.asignaturaId] && n.asignatura) {
                    infoAsignaturas[n.asignaturaId] = {
                        areaId: n.asignatura.areaId,
                        nombre: n.asignatura.nombre,
                        porcentual: n.asignatura.porcentual || 100
                    };
                }
            });

            // ------------------------------------
            // Auditoría de notas faltantes
            // ------------------------------------
            const reporteFaltantes = [];
            const diccionarioNotas = {};

            notas.forEach(n => {
                if (!diccionarioNotas[n.estudianteId]) diccionarioNotas[n.estudianteId] = {};
                if (!diccionarioNotas[n.estudianteId][n.asignaturaId]) diccionarioNotas[n.estudianteId][n.asignaturaId] = {};

                // Convertimos la nota definitiva a número.
                // Si la fila existe pero la notaDefinitiva es null, vacía, o 0, el parseFloat dará NaN o 0.
                const notaDef = parseFloat(n.notaDefinitiva);

                // Solo marcamos el periodo como "calificado" si tiene una definitiva real (mayor a 0)
                if (!isNaN(notaDef) && notaDef > 0) {
                    diccionarioNotas[n.estudianteId][n.asignaturaId][n.periodo] = true;
                }
            });

            // Cruzamos los Estudiantes vs TODAS las asignaturas encontradas (usando el diccionario)
            matriculas.forEach(m => {
                const nombreEstudiante = `${m.estudiante.primerApellido} ${m.estudiante.segundoApellido || ''} ${m.estudiante.primerNombre} ${m.estudiante.segundoNombre || ''}`.trim();

                // Usamos Object.keys de infoAsignaturas para incluir todas las materias + Comportamiento
                Object.keys(infoAsignaturas).forEach(asigIdStr => {
                    const asigId = parseInt(asigIdStr);
                    const infoAsig = infoAsignaturas[asigId];

                    const periodosFaltantesDeMateria = [];
                    periodosPermitidos.forEach(periodo => {
                        if (!diccionarioNotas[m.estudiante.id]?.[asigId]?.[periodo]) {
                            periodosFaltantesDeMateria.push(periodo);
                        }
                    });

                    if (periodosFaltantesDeMateria.length > 0) {
                        // Buscamos el docente, si no existe (como en Comportamiento), ponemos una etiqueta clara
                        const cargaOriginal = cargasDelGrupo.find(c => c.asignatura.id === asigId);
                        const nombreDocente = cargaOriginal
                            ? `${cargaOriginal.docente?.identidad?.nombre || ''} ${cargaOriginal.docente?.identidad?.apellidos || ''}`.trim()
                            : 'Director de Grupo';

                        reporteFaltantes.push({
                            estudianteId: m.estudiante.id,
                            asignaturaId: asigId,
                            docente: nombreDocente || 'Sin asignar',
                            asignatura: infoAsig.nombre,
                            periodos: periodosFaltantesDeMateria.join(" - "),
                            estudiante: nombreEstudiante
                        });
                    }
                });
            });

            // Si hay faltantes y NO han forzado el cierre, detenemos y enviamos la alerta
            if (reporteFaltantes.length > 0 && !forzarCierre) {
                await t.rollback();
                return {
                    status: 'warning',
                    mensaje: `Faltan ${reporteFaltantes.length} calificaciones por ingresar. ¿Desea forzar el cierre?`,
                    faltantes: reporteFaltantes // Enviamos el detalle al frontend
                };
            }

            // ------------------------------------
            // 4. EL CÁLCULO MATEMÁTICO (Agrupación por Asignatura y luego por Área)
            // ------------------------------------

            // Paso 4.1: Sumar las notas de los periodos por Asignatura
            const agrupacionAsig = {};

            notas.forEach(nota => {
                const estId = nota.estudianteId;
                const asigId = nota.asignaturaId;
                const valorNota = parseFloat(nota.notaDefinitiva) || 0;

                if (!agrupacionAsig[estId]) agrupacionAsig[estId] = {};
                if (!agrupacionAsig[estId][asigId]) agrupacionAsig[estId][asigId] = { suma: 0 };

                agrupacionAsig[estId][asigId].suma += valorNota;
            });

            // Paso 4.2: Calcular definitivas de asignaturas e inyectarlas ponderadas al Área
            const agrupacionAreas = {};

            for (const estId in agrupacionAsig) {
                agrupacionAreas[estId] = {};

                for (const asigId in agrupacionAsig[estId]) {
                    const sumaPeriodos = agrupacionAsig[estId][asigId].suma;
                    let promedioAsig = sumaPeriodos / totalPeriodosExigidos;

                    // Truncar la asignatura a 2 decimales para evitar redondeos que afecten el área
                    promedioAsig = Math.trunc(promedioAsig * 100) / 100;

                    const info = infoAsignaturas[asigId];
                    if (!info) continue;

                    const areaId = info.areaId;
                    const nombreAsignatura = info.nombre.toUpperCase();

                    // Criterio unificado para identificar la naturaleza de la asignatura
                    const esCriterioComportamiento = nombreAsignatura === 'COMPORTAMIENTO' || nombreAsignatura === 'DISCIPLINA' || nombreAsignatura === 'CONDUCTA';

                    if (!agrupacionAreas[estId][areaId]) {
                        agrupacionAreas[estId][areaId] = {
                            notaAreaAcumulada: 0,
                            detalles: [],
                            esComportamiento: false
                        };
                    }

                    // Si la asignatura es de comportamiento, blindamos toda su área contenedora
                    if (esCriterioComportamiento) {
                        agrupacionAreas[estId][areaId].esComportamiento = true;
                    }

                    // Ponderar por el porcentaje de la asignatura
                    const valorPonderado = promedioAsig * (info.porcentual / 100);
                    agrupacionAreas[estId][areaId].notaAreaAcumulada += valorPonderado;

                    // Guardar el rastro de la asignatura para el JSON
                    agrupacionAreas[estId][areaId].detalles.push({
                        asignaturaId: parseInt(asigId),
                        nombre: info.nombre,
                        notaFinal: promedioAsig,
                        porcentaje: info.porcentual,
                        responsablePerdida: promedioAsig < 3.0
                    });
                }
            }

            // ---------------------------------------
            // 5. PREPARAR LOS REGISTROS DE NIVELACIÓN
            // ---------------------------------------
            const registrosParaNivelar = [];
            const registrosConsolidados = [];

            for (const estId in agrupacionAreas) {
                const matriculaId = mapaMatriculas[estId];
                const areasDelEstudiante = agrupacionAreas[estId];

                // Paso 5.1: Contar cuántas áreas totales reprueba este estudiante en el grupo
                let areasReprobadasTotales = 0;
                for (const areaId in areasDelEstudiante) {
                    const areaData = areasDelEstudiante[areaId];
                    let promedioArea = areaData.notaAreaAcumulada;
                    promedioArea = Math.trunc(promedioArea * 100) / 100;

                    // Si el promedio es menor a 3.0 y no es comportamiento, suma al conteo de pérdida de año
                    if (promedioArea < 3.0 && !areaData.esComportamiento) {
                        areasReprobadasTotales++;
                    }
                }

                // Paso 5.2: Evaluar e insertar registros
                for (const areaId in areasDelEstudiante) {
                    const areaData = areasDelEstudiante[areaId];
                    let promedioArea = areaData.notaAreaAcumulada;
                    promedioArea = Math.trunc(promedioArea * 100) / 100;

                    const estadoArea = promedioArea >= 3.0 ? "APROBADO" : "REPROBADO";

                    // Determinar el Desempeño cruzando el promedio con los rangos
                    const rango = rangosCache.find(r => promedioArea >= parseFloat(r.minNota) && promedioArea <= parseFloat(r.maxNota));
                    const nombreDesempeno = rango && rango.desempeno ? rango.desempeno.nombre.toUpperCase() : "BÁSICO";

                    // Generar Juicio Histórico
                    // Pasamos un "falso" nombre de área ('COMPORTAMIENTO' o 'GENERAL') porque la función auxiliar
                    // solo necesita saber si es comportamiento o no para bifurcar su lógica.
                    const nombreFicticio = areaData.esComportamiento ? 'COMPORTAMIENTO' : 'GENERAL';
                    const juicioHistorico = obtenerJucioArea(nombreDesempeno, nombreFicticio, esPreescolar);

                    // Alimentamos el Consolidado Final (Historial permanente del alumno)
                    registrosConsolidados.push({
                        matriculaId: matriculaId,
                        areaId: parseInt(areaId),
                        vigenciaId: vigenciaId,
                        periodo: periodoDeCierre,
                        notaDefinitiva: promedioArea,
                        estadoFinal: estadoArea,
                        juicioAcademico: juicioHistorico
                    });

                    // Si el estudiante reprobó esta área y no es comportamiento, preparamos un registro de nivelación en estado PENDIENTE
                    if (promedioArea < 3.0 && !areaData.esComportamiento) {
                        registrosParaNivelar.push({
                            matriculaId: matriculaId,
                            areaId: parseInt(areaId),
                            vigenciaId: vigenciaId,
                            notaDefinitivaOriginal: promedioArea,
                            detalleAsignaturas: areaData.detalles,
                            estadoOriginal: "REPROBADO",
                            notaFinalLegal: promedioArea,
                            estadoFinal: "PENDIENTE"
                        });
                    }
                }
            }

            // ------------------------------------
            // 6. GUARDAR EN BASE DE DATOS (Masivo)
            // ------------------------------------

            // 6.1 Guardado masivo del Consolidado Final
            if (registrosConsolidados.length > 0) {
                await nivelacionRepository.guardarConsolidadosMasivo(registrosConsolidados, t);
            }

            // 6.2 Sincronización de Nivelaciones
            const matriculasProcesadasIds = matriculas.map(m => m.id); // Extraemos solo los IDs de las matrículas que estamos procesando

            // Buscamos si ya había nivelaciones PENDIENTES en la base de datos
            const nivelacionesPendientesBD = await nivelacionRepository.findNivelacionesPendientes(matriculasProcesadasIds, vigenciaId, t);

            // Creamos un diccionario rápido (Set) con las nivelaciones que SÍ deben existir (las que acabamos de calcular)
            const llavesNivelacionesReales = new Set(
                registrosParaNivelar.map(r => `${r.matriculaId}-${r.areaId}`)
            );

            // Filtramos: Si una nivelación de la BD ya NO ESTÁ en nuestro nuevo cálculo, es obsoleta y debe morir.
            const idsParaEliminar = nivelacionesPendientesBD
                .filter(niv => !llavesNivelacionesReales.has(`${niv.matriculaId}-${niv.areaId}`))
                .map(niv => niv.id);

            // Ejecutamos la purga
            if (idsParaEliminar.length > 0) {
                await nivelacionRepository.eliminarMasivoPorIds(idsParaEliminar, t);
            }

            // 6.3 Guardar las nuevas Nivelaciones / Actualizar las existentes
            if (registrosParaNivelar.length > 0) {
                await nivelacionRepository.crearMasivo(registrosParaNivelar, t);
            }

            await nivelacionRepository.marcarCierreGrupo(grupoId, t);

            await t.commit();
            return {
                procesados: registrosConsolidados.length,
                mensaje: "Consolidados generados, nivelaciones actualizadas y registros obsoletos depurados correctamente."
            };

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * Verifica si el consolidado anual ya fue generado para un grupo específico.
     */
    async verificarConsolidadoGrupo(grupoId, vigenciaId) {
        try {
            const existe = await nivelacionRepository.verificarConsolidadoGenerado(grupoId, vigenciaId);
            return !!existe;
        } catch (error) {
            console.error("Error verificando consolidado:", error);
            return false;
        }
    },

    /**
     * Obtiene los estudiantes de un grupo que reprobaron el año (3 o más áreas perdidas)
     */
    async obtenerReprobadosDirectos(grupoId, vigenciaId) {
        const areasPerdidas = await nivelacionRepository.findAreasPerdidasPorGrupo(grupoId, vigenciaId);

        // Agrupamos por estudiante
        const agrupado = {};
        areasPerdidas.forEach(reg => {
            const areaNombre = reg.area?.nombre || '';
            const esComportamiento = areaNombre === 'COMPORTAMIENTO' || areaNombre === 'DISCIPLINA';

            // No contamos comportamiento
            if (esComportamiento) return;

            const matriculaId = reg.matriculaId;
            if (!agrupado[matriculaId]) {
                agrupado[matriculaId] = {
                    matriculaId: matriculaId,
                    nombreEstudiante: `${reg.matricula.estudiante.primerApellido} ${reg.matricula.estudiante.segundoApellido || ''} ${reg.matricula.estudiante.primerNombre} ${reg.matricula.estudiante.segundoNombre || ''}`.trim(),
                    areasPerdidas: []
                };
            }

            agrupado[matriculaId].areasPerdidas.push({
                nombre: areaNombre,
                nota: reg.notaDefinitiva
            });
        });

        // Filtramos solo los que perdieron 3 o más
        return Object.values(agrupado).filter(est => est.areasPerdidas.length >= 3);
    },

    /**
     * Rellena las notas faltantes expandiendo el valor SÓLO a las sub-notas vacías,
     * respetando el trabajo previo del docente y calculando la definitiva real.
     */
    async guardarCalificacionesPendientes(notas, vigenciaId) {
        const t = await sequelize.transaction();
        try {
            // 1. Cargamos los rangos de desempeño UNA SOLA VEZ para toda la iteración
            const rangosCache = await nivelacionRepository.findRangosDesempeno(vigenciaId);

            // 2. Extraer TODAS las calificaciones pre-existentes de estos estudiantes para no sobrescribir a ciegas
            const estudiantesIds = notas.map(n => n.estudianteId);
            const asignaturasIds = notas.map(n => n.asignaturaId);

            const existentesBD = await calificacionRepository.findCalificacionesParaMerge(
                vigenciaId, estudiantesIds, asignaturasIds, t
            );

            // Creamos un diccionario rápido para buscar: "estId-asigId-periodo"
            const diccExistentes = {};
            existentesBD.forEach(c => {
                diccExistentes[`${c.estudianteId}-${c.asignaturaId}-${c.periodo}`] = c;
            });

            // 3. Preparamos el arreglo con la matemática completa
            const registrosCompletos = [];

            for (const nota of notas) {
                const valorRelleno = parseFloat(nota.notaDefinitiva); // Ej: El 1.0 ingresado masivamente
                const keyBusqueda = `${nota.estudianteId}-${nota.asignaturaId}-${nota.periodo}`;
                const registroParcial = diccExistentes[keyBusqueda];

                // --- EL MERGE (Fusión de datos) ---
                // Si existe un registro y la nota es mayor a 0, se respeta. Si no, se inyecta el valor de relleno.
                const nAcad = (registroParcial && parseFloat(registroParcial.notaAcademica) > 0) ? parseFloat(registroParcial.notaAcademica) : valorRelleno;
                const nAcum = (registroParcial && parseFloat(registroParcial.notaAcumulativa) > 0) ? parseFloat(registroParcial.notaAcumulativa) : valorRelleno;
                const nLab = (registroParcial && parseFloat(registroParcial.notaLaboral) > 0) ? parseFloat(registroParcial.notaLaboral) : valorRelleno;
                const nSoc = (registroParcial && parseFloat(registroParcial.notaSocial) > 0) ? parseFloat(registroParcial.notaSocial) : valorRelleno;

                // Calculamos los ponderados reales basados en la fusión
                const pAcad = nAcad * PORCENTAJES.ACADEMICA;
                const pAcum = nAcum * PORCENTAJES.ACUMULATIVA;
                const pLab = nLab * PORCENTAJES.LABORAL;
                const pSoc = nSoc * PORCENTAJES.SOCIAL;

                // La nueva definitiva es la suma matemática exacta de las notas fusionadas
                let nuevaDefinitiva = pAcad + pAcum + pLab + pSoc;
                nuevaDefinitiva = Math.trunc(nuevaDefinitiva * 100) / 100; // Truncamos a 2 decimales para evitar problemas de flotantes en JS (ej. 3.400000001)

                // Necesitamos saber el nivel académico para los juicios
                const matricula = await nivelacionRepository.findMatriculaConNivelAcademico(nota.estudianteId, vigenciaId, t);

                const contextJuicio = {
                    vigenciaId,
                    asignaturaId: nota.asignaturaId,
                    gradoId: matricula.grupo.gradoId,
                    periodo: nota.periodo,
                    nivelAcademico: matricula.grupo.grado.nivelAcademico
                };

                // Buscamos los textos reales en la tabla de juicios evaluando sobre las notas fusionadas
                const [jAcad, jAcum, jLab, jSoc] = await Promise.all([
                    obtenerJuicio(nAcad, rangosCache, contextJuicio, DIM.ACADEMICA),
                    obtenerJuicio(nAcum, rangosCache, contextJuicio, DIM.ACUMULATIVA),
                    obtenerJuicio(nLab, rangosCache, contextJuicio, DIM.LABORAL),
                    obtenerJuicio(nSoc, rangosCache, contextJuicio, DIM.SOCIAL)
                ]);

                registrosCompletos.push({
                    estudianteId: nota.estudianteId,
                    asignaturaId: nota.asignaturaId,
                    periodo: nota.periodo,
                    vigenciaId: vigenciaId,
                    notaAcademica: nAcad, promedioAcademica: pAcad,
                    notaAcumulativa: nAcum, promedioAcumulativa: pAcum,
                    notaLaboral: nLab, promedioLaboral: pLab,
                    notaSocial: nSoc, promedioSocial: pSoc,
                    notaDefinitiva: nuevaDefinitiva,
                    juicioAcademica: jAcad,
                    juicioAcumulativa: jAcum,
                    juicioLaboral: jLab,
                    juicioSocial: jSoc,
                    observacion_cambio: "REGISTRO MASIVO - CIERRE DE AÑO (MERGE)",
                    fecha_edicion: new Date()
                });
            }

            // Guardamos todos los registros completos en la tabla de calificaciones
            await calificacionRepository.guardarMasivo(registrosCompletos, { transaction: t });

            await t.commit();
            return { success: true, message: "Calificaciones fusionadas y guardadas correctamente." };
        } catch (error) {
            await t.rollback();
            console.error("Error crítico procesando notas masivas con juicios:", error);
            throw new Error("No se pudo completar el guardado masivo con integridad de datos.");
        }
    }
};