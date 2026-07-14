import { boletinRepository } from "../repositories/boletin.repository.js";
import { codigoBoletinService } from "./codigoBoletin.service.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Configuración de rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const boletinService = {

    /**
     * Función principal orquestadora.
     */
    async generarDatosBoletinLote(grupoId, vigenciaId, anioLectivo, periodoActual, tipoBoletinReq, estudianteId, usuarioId) {

        // =========================================================
        // FASE 1: EXTRACCIÓN MASIVA DE DATOS DESDE LA BASE DE DATOS
        // =========================================================
        const { grupo, colegio } = await boletinRepository.findInfoGrupo(grupoId);

        const esPreescolar = grupo.grado.nivelAcademico === 'PREESCOLAR';
        const tipoBoletin = esPreescolar ? 'DESCRIPTIVO' : tipoBoletinReq;

        // Lógica de dinámica de cierre de año
        const nombreGrado = (grupo.grado.nombre || '').toUpperCase();

        const esCicloVI = nombreGrado.includes('CICLO_VI') || nombreGrado.includes('CICLO VI');
        const esCicloV = !esCicloVI && (nombreGrado.includes('CICLO_V') || nombreGrado.includes('CICLO V'));

        // Define dinámicamente si es Informe Final
        const esPeriodoFinal = (esCicloV && Number(periodoActual) === 3) || (Number(periodoActual) === 5);

        const rangosDb = await boletinRepository.findRangosDesempeno(vigenciaId);
        const rangosDesempeno = rangosDb.map(r => ({
            desde: r.minNota.toFixed(2),
            hasta: r.maxNota.toFixed(2),
            desempeno: r.desempeno?.nombre || ''
        }));

        // Obtenemos TODOS los estudiantes del grupo
        let matriculasTotales = await boletinRepository.findMatriculasPorGrupo(grupoId, vigenciaId);

        // Excluir a los estudiantes anulados
        matriculasTotales = matriculasTotales.filter(m => m.estado !== 'ANULADO');

        // Si es Informe Final, solo pasan PROMOVIDOS o REPROBADOS
        if (esPeriodoFinal) {
            matriculasTotales = matriculasTotales.filter(m => m.estado === 'PROMOVIDO' || m.estado === 'REPROBADO');

            if (matriculasTotales.length === 0) {
                throw new Error("No se puede generar el Informe Final porque ningún estudiante del grupo tiene estado PROMOVIDO o REPROBADO. Debe ejecutar primero el proceso de promoción de fin de año.");
            }
        } else {
            // Si es un periodo regular (1 al 4), filtramos los RETIRADOS para no sacarles boletín
            matriculasTotales = matriculasTotales.filter(m => m.estado !== 'RETIRADO');
        }

        if (!matriculasTotales || matriculasTotales.length === 0) {
            throw new Error("No hay estudiantes válidos para generar boletines en este periodo.");
        }

        // Extraemos las notas de TODO EL GRUPO para que los promedios y puestos sean
        const idsEstudiantesTotales = matriculasTotales.map(m => m.estudiante.id);
        const idsMatriculasTotales = matriculasTotales.map(m => m.id);

        const cargas = await boletinRepository.findCargasPorGrupo(grupoId, vigenciaId);

        // Definimos el límite de periodos a extraer. Si es final, evalúa máximo hasta el periodo 4.
        const maxPeriodoFetch = esPeriodoFinal ? 4 : Number(periodoActual);

        // Pasamos maxPeriodoFetch al repositorio para aligerar la carga de la consulta
        const calificacionesPlanas = await boletinRepository.findCalificacionesHistoricasLote(idsEstudiantesTotales, vigenciaId, maxPeriodoFetch);

        // Solo para el periodo final, traemos las calificaciones consolidadas de áreas y las nivelaciones
        let consolidadosAreas = [];
        let nivelaciones = [];
        if (esPeriodoFinal) {
            consolidadosAreas = await boletinRepository.findCalificacionesAreasLote(idsMatriculasTotales);
            nivelaciones = await boletinRepository.findNivelacionesLote(idsMatriculasTotales);
        }

        // Validar que al menos alguien tenga notas en el periodo solicitado
        const tieneNotasPeriodo = esPeriodoFinal
            ? consolidadosAreas.length > 0
            : calificacionesPlanas.some(cal => Number(cal.periodo) === Number(periodoActual));

        if (!tieneNotasPeriodo) {
            throw new Error(`No hay calificaciones registradas para el periodo y grupo seleccionado. No se puede generar el boletín.`);
        }

        // =========================================================
        // FASE 2: CÁLCULOS EN MEMORIA
        // =========================================================
        const notasAgrupadas = _agruparNotasJerarquia(calificacionesPlanas, cargas, esPreescolar, tipoBoletin, periodoActual, rangosDesempeno, matriculasTotales, consolidadosAreas, nivelaciones, esPeriodoFinal);
        const { promediosGrupo, rankingEstudiantes } = _calcularEstadisticasYPuestos(notasAgrupadas, idsEstudiantesTotales);

        // =========================================================
        // FASE 3: ENSAMBLAJE DEL MEGA-OBJETO JSON
        // =========================================================

        // Decidimos a quiénes vamos a generarles el PDF
        let matriculasImprimir = matriculasTotales;
        if (estudianteId) {
            matriculasImprimir = matriculasTotales.filter(m => m.estudiante.id === Number(estudianteId));
        }

        const boletinesGenerados = await Promise.all(matriculasImprimir.map(async (matricula) => {
            const estId = matricula.estudiante.id;
            const notasEstudiante = notasAgrupadas[estId] || [];
            const estadisticas = rankingEstudiantes[estId] || {};

            // Buscamos si ya existe un código para este estudiante en este periodo, para incluirlo en el boletín (puede ser null)
            let registroCodigo = await codigoBoletinService.obtenerCodigoPorMatricula(matricula.id, periodoActual);

            // Si no existe, lo creamos "al vuelo" (silenciosamente)
            if (!registroCodigo) {
                registroCodigo = await codigoBoletinService.generarCodigoUnitario(
                    matricula.id,
                    vigenciaId,
                    periodoActual,
                    usuarioId
                );
            }

            return {
                infoPersonal: {
                    nombreCompleto: `${matricula.estudiante.primerApellido} ${matricula.estudiante.segundoApellido || ''} ${matricula.estudiante.primerNombre} ${matricula.estudiante.segundoNombre || ''}`.trim(),
                    documento: matricula.estudiante.documento,
                    estadoPromocion: matricula.estado
                },
                // Inyectamos el código alfanumérico para que Handlebars lo use
                codigoVerificacion: registroCodigo.codigo,

                cuadroHistorico: esPreescolar ? null : {
                    promediosEstudiante: estadisticas.promedios,
                    puestosEstudiante: estadisticas.puestos,
                    totalEstudiantes: matriculasTotales.length // Para mostrar "Puesto X de Y"
                },
                areas: notasEstudiante
            };
        }));

        const logoBase64 = await _obtenerLogoBase64();

        // Reemplazar todos los guiones bajos por espacios en el grado
        const gradoFormateado = (grupo.grado?.nombre || "N/A").toUpperCase().replace(/_/g, ' ');

        // Formatear la jornada para reportes oficiales
        let jornadaFormateada = (grupo.jornada || "N/A").toUpperCase();
        if (jornadaFormateada === 'NOCHE') {
            jornadaFormateada = 'NOCTURNA';
        } else if (jornadaFormateada === 'MANANA') {
            jornadaFormateada = 'MAÑANA';
        }

        return {
            encabezadoInstitucional: {
                nombre: colegio.nombre,
                dane_nit: `Registro DANE: ${colegio.registroDane}`,
                contacto: `Tel: ${colegio.contacto || ''} - Email: ${colegio.email || ''}`,
                direccion: `${colegio.direccion}, ${colegio.ciudad} - ${colegio.departamento}`,
                logoUrl: logoBase64
            },
            configuracionImpresion: {
                tituloBoletin: `BOLETÍN ${tipoBoletin}`,
                periodoActual: periodoActual,
                anioLectivo: anioLectivo,
                esPreescolar: esPreescolar,
                esValorativo: tipoBoletin === 'VALORATIVO',
                esPeriodoFinal: esPeriodoFinal
            },
            grupo: {
                grado: gradoFormateado,
                grupoNombre: grupo.nombre,
                jornada: jornadaFormateada,
                sede: grupo.sede?.nombre ? grupo.sede.nombre.toUpperCase() : 'Sede no asignada',
                directorGrupo: grupo.director ? `${grupo.director.identidad?.nombre || grupo.director.nombre || ''} ${grupo.director.identidad?.apellidos || grupo.director.apellidos || ''}`.trim() : 'SIN ASIGNAR',
                promedioGrupoHistorico: promediosGrupo
            },
            rangosDesempeno,
            estudiantes: boletinesGenerados
        };
    },

    /**
     * Auditoría para detectar notas faltantes en el periodo actual,
     * con detalle de qué nota falta y quién es el docente responsable.
     */
    async auditarNotasPendientes(grupoId, vigenciaId, periodoActual) {
        const { grupo } = await boletinRepository.findInfoGrupo(grupoId);

        const esPreescolar = grupo.grado.nivelAcademico === 'PREESCOLAR';

        // 1. Traer matrículas activas
        let matriculasTotales = await boletinRepository.findMatriculasPorGrupo(grupoId, vigenciaId);
        matriculasTotales = matriculasTotales.filter(m =>
            m.bloqueo_notas !== true && m.bloqueo_notas !== 1 &&
            !['ANULADO'].includes(m.estado)
        );

        // Validación: Si no hay estudiantes, no tiene sentido auditar nada
        if (matriculasTotales.length === 0) {
            throw new Error("No se encontraron estudiantes matriculados y activos en este grupo.");
        }

        // 2. Traer Cargas (para saber quién dicta qué) y Notas Planas
        const idsEstudiantes = matriculasTotales.map(m => m.estudiante.id);
        const cargas = await boletinRepository.findCargasPorGrupo(grupoId, vigenciaId);

        // Validación: Si no hay cargas, no tiene sentido auditar nada
        if (!cargas || cargas.length === 0) {
            throw new Error("El grupo seleccionado aún no tiene carga académica (asignaturas) asignada en esta vigencia.");
        }

        const perActual = Number(periodoActual);

        // Pasamos perActual para auditar solo hasta el periodo solicitado
        const calificacionesPlanas = await boletinRepository.findCalificacionesHistoricasLote(idsEstudiantes, vigenciaId, perActual);

        // 3. Crear diccionario de acceso ultra rápido
        const diccNotas = {};
        calificacionesPlanas.forEach(c => {
            if (!diccNotas[c.estudianteId]) diccNotas[c.estudianteId] = {};
            if (!diccNotas[c.estudianteId][c.asignaturaId]) diccNotas[c.estudianteId][c.asignaturaId] = {};
            diccNotas[c.estudianteId][c.asignaturaId][c.periodo] = c;
        });

        // 4. Cruzar información y determinar los periodos VÁLIDOS a auditar
        const nombreGrado = (grupo.grado.nombre || '').toUpperCase();
        const esCicloVI = nombreGrado.includes('CICLO_VI') || nombreGrado.includes('CICLO VI');
        const esCicloV = !esCicloVI && (nombreGrado.includes('CICLO_V') || nombreGrado.includes('CICLO V'));

        let periodosAEvaluar = [];

        if (esCicloVI) {
            if (perActual >= 3) periodosAEvaluar.push(3);
            if (perActual >= 4 && perActual !== 5) periodosAEvaluar.push(4); // Si es 5, igual solo audita hasta 4
        } else if (esCicloV) {
            if (perActual >= 1) periodosAEvaluar.push(1);
            if (perActual >= 2 && perActual !== 3) periodosAEvaluar.push(2);
        } else {
            for (let i = 1; i <= perActual && i <= 4; i++) {
                periodosAEvaluar.push(i);
            }
        }

        // Buscamos la asignatura de Comportamiento para auditarla independientemente de las cargas
        const asignaturaComportamiento = await boletinRepository.findAsignaturaComportamiento();

        const reporteFaltantes = [];

        matriculasTotales.forEach(m => {
            cargas.forEach(carga => {
                const asigNombre = (carga.asignatura?.nombre || '').toUpperCase();
                if (asigNombre === 'COMPORTAMIENTO' || asigNombre === 'DISCIPLINA') return;

                periodosAEvaluar.forEach(periodo => {
                    const notaObj = diccNotas[m.estudiante.id]?.[carga.asignaturaId]?.[periodo];
                    let notasFaltantesDetalle = [];

                    if (!notaObj) {
                        notasFaltantesDetalle.push("Ninguna nota registrada");
                    } else {
                        // Para las demás asignaturas, validamos las 4 columnas internas
                        if (notaObj.notaAcademica === null || notaObj.notaAcademica === undefined) notasFaltantesDetalle.push("Académica");
                        if (notaObj.notaAcumulativa === null || notaObj.notaAcumulativa === undefined) notasFaltantesDetalle.push("Acumulativa");
                        if (notaObj.notaLaboral === null || notaObj.notaLaboral === undefined) notasFaltantesDetalle.push("Laboral");
                        if (notaObj.notaSocial === null || notaObj.notaSocial === undefined) notasFaltantesDetalle.push("Social");
                    }

                    // Si le falta algo, va para el reporte
                    if (notasFaltantesDetalle.length > 0) {
                        reporteFaltantes.push({
                            docente: carga.docente ? `${carga.docente.identidad?.nombre || carga.docente.nombre || ''} ${carga.docente.identidad?.apellidos || carga.docente.apellidos || ''}`.trim() : 'Sin asignar',
                            asignatura: carga.asignatura.nombre,
                            periodo: `Periodo ${periodo}`,
                            detalle: notasFaltantesDetalle.join(" / "),
                            estudiante: `${m.estudiante.primerApellido} ${m.estudiante.segundoApellido || ''} ${m.estudiante.primerNombre} ${m.estudiante.segundoNombre || ''}`.replace(/\s+/g, ' ').trim()
                        });
                    }
                });
            });

            if (asignaturaComportamiento) {
                periodosAEvaluar.forEach(periodo => {
                    const notaCompObj = diccNotas[m.estudiante.id]?.[asignaturaComportamiento.id]?.[periodo];

                    if (!notaCompObj || notaCompObj.notaAcademica === null || notaCompObj.notaAcademica === undefined) {
                        const nombreDirector = grupo.director ? `${grupo.director.identidad?.nombre || grupo.director.nombre || ''} ${grupo.director.identidad?.apellidos || grupo.director.apellidos || ''}`.trim() : "";

                        reporteFaltantes.push({
                            docente: `${nombreDirector}`,
                            asignatura: asignaturaComportamiento.nombre,
                            periodo: `Periodo ${periodo}`,
                            detalle: !notaCompObj ? "Ninguna nota registrada" : "Valoración de Comportamiento",
                            estudiante: `${m.estudiante.primerApellido} ${m.estudiante.segundoApellido || ''} ${m.estudiante.primerNombre} ${m.estudiante.segundoNombre || ''}`.replace(/\s+/g, ' ').trim()
                        });
                    }
                });
            }
        });

        return reporteFaltantes;
    }
};

// =========================================================
// FUNCIONES AUXILIARES PRIVADAS
// =========================================================

function _agruparNotasJerarquia(calificacionesPlanas, cargas, esPreescolar, tipoBoletin, periodoActual, rangosDesempeno, matriculasTotales = [], consolidadosAreas = [], nivelaciones = [], esPeriodoFinal = false) {
    const diccionario = {};

    calificacionesPlanas.forEach(cal => {
        const estId = cal.estudianteId;
        const areaNombre = (cal.asignatura?.area?.nombre || 'SIN ÁREA').toUpperCase().trim();
        const areaId = cal.asignatura?.area?.id;
        const asigNombre = (cal.asignatura?.nombre || 'SIN ASIGNATURA').toUpperCase().trim();
        const porcentaje = cal.asignatura?.porcentual || 100;

        const esComportamiento = areaNombre === 'COMPORTAMIENTO' || areaNombre === 'DISCIPLINA';
        const isPeriodoActual = Number(cal.periodo) === Number(periodoActual);

        if (!diccionario[estId]) diccionario[estId] = {};
        if (!diccionario[estId][areaNombre]) {
            diccionario[estId][areaNombre] = {
                areaId: areaId,
                nombreArea: areaNombre,
                esComportamiento: esComportamiento,
                asignaturasObj: {}
            };
        }

        let areaRef = diccionario[estId][areaNombre];

        if (!areaRef.asignaturasObj[asigNombre]) {
            const cargaAsig = cargas.find(c => c.asignaturaId === cal.asignaturaId);

            areaRef.asignaturasObj[asigNombre] = {
                nombreAsignatura: asigNombre,
                esComportamiento: esComportamiento,
                docente: "",
                intensidadHoraria: esPreescolar ? cargaAsig?.horas : null,
                porcentajePeso: porcentaje,
                notasHistoricas: { p1: null, p2: null, p3: null, p4: null },
                fallas: 0,
                recomendaciones: [],
                gruposDimensiones: [],
                textoComportamiento: null
            };
        }

        let asigRef = areaRef.asignaturasObj[asigNombre];

        asigRef.fallas += (cal.fallas || 0);

        if (cal.periodo >= 1 && cal.periodo <= 4) {
            asigRef.notasHistoricas[`p${cal.periodo}`] = cal.notaDefinitiva;
        }

        if (isPeriodoActual) {
            if (cal.docenteResponsable?.identidad) {
                const n = cal.docenteResponsable.identidad.nombre;
                const a = cal.docenteResponsable.identidad.apellidos;
                const nombreCompleto = `${n} ${a}`.trim();
                if (nombreCompleto) asigRef.docente = nombreCompleto;
            }
        }

        // Si es comportamiento, extraemos solo el texto del periodo actual
        if (esComportamiento && isPeriodoActual) {
            asigRef.textoComportamiento = cal.juicioAcademica || "Sin registro descriptivo de comportamiento.";
        }

        // --- CÁLCULOS MATEMÁTICOS PARA EL PERIODO ACTUAL ---
        if (isPeriodoActual && cal.notaDefinitiva !== null && !esComportamiento) {

            // SIEMPRE calculamos la fórmula de la asignatura (Para Descriptivo y Valorativo)
            const formatNota2Dec = (num) => num ? Number(num).toFixed(2).replace('.', ',') : "0,00";
            asigRef.formulaPorcentajeExtra = `(Nota ${formatNota2Dec(cal.notaDefinitiva)} x ${porcentaje}% = ${(cal.notaDefinitiva * (porcentaje / 100)).toFixed(4).replace('.', ',')})`;

            // SOLO si es Descriptivo armamos los juicios
            if (tipoBoletin === 'DESCRIPTIVO') {
                if (esPreescolar) {
                    asigRef.gruposDimensiones = [
                        { tituloCabecera: "COMPETENCIA ACADÉMICA", dimensiones: [{ formula: null, juicio: cal.juicioAcademica }, { formula: null, juicio: cal.juicioAcumulativa }].filter(d => d.juicio) },
                        { tituloCabecera: "COMPETENCIAS LABORAL Y SOCIAL", dimensiones: [{ formula: null, juicio: cal.juicioLaboral }].filter(d => d.juicio) }
                    ];
                } else {
                    const formatNota = (num) => num ? Number(num).toFixed(1).replace('.', ',') : "0,0";
                    const formatProm = (num) => num ? Number(num).toFixed(3).replace('.', ',') : "0,000";

                    asigRef.gruposDimensiones = [
                        {
                            tituloCabecera: "COMPETENCIA ACADÉMICA Y EVALUACIÓN ACUMULATIVA",
                            dimensiones: [
                                { formula: `${formatNota(cal.notaAcademica)} x 50% = ${formatProm(cal.promedioAcademica)}`, juicio: cal.juicioAcademica || "Sin registro." },
                                { formula: `${formatNota(cal.notaAcumulativa)} x 20% = ${formatProm(cal.promedioAcumulativa)}`, juicio: cal.juicioAcumulativa || "Sin registro." }
                            ]
                        },
                        {
                            tituloCabecera: "COMPETENCIAS LABORAL Y SOCIAL",
                            dimensiones: [
                                { formula: `${formatNota(cal.notaLaboral)} x 15% = ${formatProm(cal.promedioLaboral)}`, juicio: cal.juicioLaboral || "Sin registro." },
                                { formula: `${formatNota(cal.notaSocial)} x 15% = ${formatProm(cal.promedioSocial)}`, juicio: cal.juicioSocial || "Sin registro." }
                            ]
                        }
                    ];
                }

                if (cal.recomendacionUno) asigRef.recomendaciones.push(cal.recomendacionUno);
                if (cal.recomendacionDos) asigRef.recomendaciones.push(cal.recomendacionDos);
            }
        }
    });

    const resultadoFinal = {};
    for (const estId in diccionario) {

        // Buscar la matrícula del estudiante para el Periodo 5
        const matricula = matriculasTotales.find(m => m.estudiante.id === Number(estId));
        const matriculaId = matricula ? matricula.id : null;

        resultadoFinal[estId] = Object.values(diccionario[estId]).map(area => {
            const listaAsignaturas = Object.values(area.asignaturasObj);
            const esComportamiento = area.esComportamiento;
            const mostrarNombreAsignatura = listaAsignaturas.length > 1; // Mostramos el nombre de la asignatura solo si hay más de 1

            // Extraemos info de comportamiento para subirla al Área
            let docenteComportamiento = null;
            let textoComportamiento = null;
            if (esComportamiento && listaAsignaturas.length > 0) {
                docenteComportamiento = listaAsignaturas[0].docente;
                textoComportamiento = listaAsignaturas[0].textoComportamiento;
            }

            let acumuladoArea = 0;
            let fallasArea = 0;
            let ihArea = 0;
            let areaP1 = 0, areaP2 = 0, areaP3 = 0, areaP4 = 0;
            let tieneP1 = false, tieneP2 = false, tieneP3 = false, tieneP4 = false;

            listaAsignaturas.forEach(a => {
                const sumaNotas = (a.notasHistoricas.p1 || 0) + (a.notasHistoricas.p2 || 0) + (a.notasHistoricas.p3 || 0) + (a.notasHistoricas.p4 || 0);
                acumuladoArea += (sumaNotas * (a.porcentajePeso / 100));

                fallasArea += (a.fallas || 0);
                ihArea += (a.intensidadHoraria || 0);

                if (a.notasHistoricas.p1 !== null) { areaP1 += (a.notasHistoricas.p1 * (a.porcentajePeso / 100)); tieneP1 = true; }
                if (a.notasHistoricas.p2 !== null) { areaP2 += (a.notasHistoricas.p2 * (a.porcentajePeso / 100)); tieneP2 = true; }
                if (a.notasHistoricas.p3 !== null) { areaP3 += (a.notasHistoricas.p3 * (a.porcentajePeso / 100)); tieneP3 = true; }
                if (a.notasHistoricas.p4 !== null) { areaP4 += (a.notasHistoricas.p4 * (a.porcentajePeso / 100)); tieneP4 = true; }
            });

            let metaEsperada = 0;
            if (Number(periodoActual) === 1) metaEsperada = 3.0;
            else if (Number(periodoActual) === 2) metaEsperada = 6.0;
            else if (Number(periodoActual) === 3) metaEsperada = 9.0;
            else if (Number(periodoActual) === 4) metaEsperada = 12.0;

            // Redondeamos el acumulado a 2 decimales para evitar problemas de precisión en JS (ej. 2.999 -> 3.00)
            const acumuladoLimpio = Math.round(acumuladoArea * 100) / 100;

            // Evaluamos si es MAYOR O IGUAL (>=) a la meta exacta
            let estadoGanandoPerdiendo = acumuladoLimpio > 0 ? (acumuladoLimpio >= metaEsperada ? 'G' : 'PR') : '';

            let desempenoAreaText = "";
            let notaDefinitivaAreaFinal = acumuladoLimpio > 0 ? acumuladoLimpio.toFixed(2) : "";
            let notaNivelacionAsignada = null;
            let juicioAreaTexto = "";

            if (esPeriodoFinal && matriculaId && area.areaId) {
                const consolidado = consolidadosAreas.find(c => c.matriculaId === matriculaId && c.areaId === area.areaId);

                if (consolidado) {
                    // 1. HIGIENIZACIÓN DE LA NOTA DEL CONSOLIDADO
                    const notaConsLimpia = String(consolidado.notaDefinitiva).replace(',', '.');
                    const notaConsNum = Number(notaConsLimpia);
                    notaDefinitivaAreaFinal = !isNaN(notaConsNum) ? notaConsNum.toFixed(2) : "";

                    estadoGanandoPerdiendo = consolidado.estadoFinal === 'APROBADO' ? 'G' : 'PR';
                    juicioAreaTexto = consolidado.juicioAcademico || "Sin registro descriptivo.";

                    // 2. BLOQUE DE NIVELACIÓN
                    const nivelacion = nivelaciones.find(n => Number(n.matriculaId) === Number(matriculaId) && Number(n.areaId) === Number(area.areaId));
                    if (nivelacion) {
                        const notaNivLimpia = String(nivelacion.notaNivelacion).replace(',', '.');
                        const notaNivNum = Number(notaNivLimpia);

                        if (!isNaN(notaNivNum) && notaNivNum > 0) {
                            notaNivelacionAsignada = "3.00";
                            notaDefinitivaAreaFinal = "3.00";
                            estadoGanandoPerdiendo = 'G';
                        }
                    }

                    // 3. BLOQUE DE DESEMPEÑO BLINDADO
                    const notaFinalNum = Number(notaDefinitivaAreaFinal);
                    if (!isNaN(notaFinalNum) && notaFinalNum > 0) {
                        const rangoFinal = rangosDesempeno.find(r => {
                            // Mapeo dinámico por si la BD usa distintos nombres de columna
                            const desdeProp = r.desde || r.nota_minima || r.minimo || r.desdeNota;
                            const hastaProp = r.hasta || r.nota_maxima || r.maximo || r.hastaNota;

                            const desdeNum = Number(String(desdeProp).replace(',', '.'));
                            const hastaNum = Number(String(hastaProp).replace(',', '.'));

                            return notaFinalNum >= desdeNum && notaFinalNum <= hastaNum;
                        });

                        if (rangoFinal) {
                            desempenoAreaText = (rangoFinal.desempeno || rangoFinal.nombre || rangoFinal.nombre_desempeno || "").toUpperCase();
                        }
                    }

                } else {
                    // Fallback de seguridad en memoria si el registro no existiera
                    notaDefinitivaAreaFinal = acumuladoLimpio > 0 ? acumuladoLimpio.toFixed(2) : "";
                    estadoGanandoPerdiendo = acumuladoLimpio >= metaEsperada ? 'G' : 'PR';
                }
            } else {
                // ---> MODO NORMAL: Periodos 1 al 4
                let notaPeriodoActual = 0;
                if (Number(periodoActual) === 1 && tieneP1) notaPeriodoActual = areaP1;
                else if (Number(periodoActual) === 2 && tieneP2) notaPeriodoActual = areaP2;
                else if (Number(periodoActual) === 3 && tieneP3) notaPeriodoActual = areaP3;
                else if (Number(periodoActual) === 4 && tieneP4) notaPeriodoActual = areaP4;

                if (notaPeriodoActual > 0) {
                    const n = Number(notaPeriodoActual.toFixed(2));
                    const rango = rangosDesempeno.find(r => n >= Number(r.desde) && n <= Number(r.hasta));
                    if (rango) desempenoAreaText = rango.desempeno.toUpperCase();
                }
            }

            return {
                nombreArea: area.nombreArea,
                esComportamiento: esComportamiento,
                mostrarNombreAsignatura: mostrarNombreAsignatura,
                docenteComportamiento: docenteComportamiento,
                textoComportamiento: textoComportamiento,
                fallasArea: esComportamiento ? "" : fallasArea,
                p1Area: tieneP1 ? areaP1.toFixed(2) : "",
                p2Area: tieneP2 ? areaP2.toFixed(2) : "",
                p3Area: tieneP3 ? areaP3.toFixed(2) : "",
                p4Area: tieneP4 ? areaP4.toFixed(2) : "",
                acumuladoActualArea: notaDefinitivaAreaFinal,
                notaNivelacion: notaNivelacionAsignada,
                juicioAutomaticoArea: juicioAreaTexto,
                estadoGanandoPerdiendo: esPreescolar ? null : estadoGanandoPerdiendo,
                desempenoArea: desempenoAreaText,
                ihArea: ihArea > 0 ? ihArea : "",
                asignaturas: listaAsignaturas
            };
        }).sort((a, b) => {
            if (a.esComportamiento && !b.esComportamiento) return 1;
            if (!a.esComportamiento && b.esComportamiento) return -1;
            return a.nombreArea.localeCompare(b.nombreArea);
        });
    }

    return resultadoFinal;
}

function _calcularEstadisticasYPuestos(notasAgrupadas, idsEstudiantes) {
    const promediosGrupoAcumulador = {
        p1: { suma: 0, count: 0 }, p2: { suma: 0, count: 0 }, p3: { suma: 0, count: 0 }, p4: { suma: 0, count: 0 }
    };
    const rankingEstudiantes = {};
    const promediosPorPeriodo = { p1: [], p2: [], p3: [], p4: [] };

    for (const estId of idsEstudiantes) {
        const areasEstudiante = notasAgrupadas[estId] || [];
        let sumaP1 = 0, countP1 = 0; let sumaP2 = 0, countP2 = 0; let sumaP3 = 0, countP3 = 0; let sumaP4 = 0, countP4 = 0;

        areasEstudiante.forEach(area => {
            if (!area.esComportamiento) {
                let notaAreaP1 = 0, notaAreaP2 = 0, notaAreaP3 = 0, notaAreaP4 = 0;
                let tieneP1 = false, tieneP2 = false, tieneP3 = false, tieneP4 = false;

                area.asignaturas.forEach(asig => {
                    if (asig.notasHistoricas.p1 !== null) { notaAreaP1 += (asig.notasHistoricas.p1 * (asig.porcentajePeso / 100)); tieneP1 = true; }
                    if (asig.notasHistoricas.p2 !== null) { notaAreaP2 += (asig.notasHistoricas.p2 * (asig.porcentajePeso / 100)); tieneP2 = true; }
                    if (asig.notasHistoricas.p3 !== null) { notaAreaP3 += (asig.notasHistoricas.p3 * (asig.porcentajePeso / 100)); tieneP3 = true; }
                    if (asig.notasHistoricas.p4 !== null) { notaAreaP4 += (asig.notasHistoricas.p4 * (asig.porcentajePeso / 100)); tieneP4 = true; }
                });

                if (tieneP1) { sumaP1 += notaAreaP1; countP1++; }
                if (tieneP2) { sumaP2 += notaAreaP2; countP2++; }
                if (tieneP3) { sumaP3 += notaAreaP3; countP3++; }
                if (tieneP4) { sumaP4 += notaAreaP4; countP4++; }
            }
        });

        const promEstP1 = countP1 > 0 ? parseFloat((sumaP1 / countP1).toFixed(2)) : null;
        const promEstP2 = countP2 > 0 ? parseFloat((sumaP2 / countP2).toFixed(2)) : null;
        const promEstP3 = countP3 > 0 ? parseFloat((sumaP3 / countP3).toFixed(2)) : null;
        const promEstP4 = countP4 > 0 ? parseFloat((sumaP4 / countP4).toFixed(2)) : null;

        rankingEstudiantes[estId] = {
            promedios: { p1: promEstP1, p2: promEstP2, p3: promEstP3, p4: promEstP4 },
            puestos: { p1: null, p2: null, p3: null, p4: null }
        };

        if (promEstP1 !== null) { promediosPorPeriodo.p1.push({ estId, nota: promEstP1 }); promediosGrupoAcumulador.p1.suma += promEstP1; promediosGrupoAcumulador.p1.count++; }
        if (promEstP2 !== null) { promediosPorPeriodo.p2.push({ estId, nota: promEstP2 }); promediosGrupoAcumulador.p2.suma += promEstP2; promediosGrupoAcumulador.p2.count++; }
        if (promEstP3 !== null) { promediosPorPeriodo.p3.push({ estId, nota: promEstP3 }); promediosGrupoAcumulador.p3.suma += promEstP3; promediosGrupoAcumulador.p3.count++; }
        if (promEstP4 !== null) { promediosPorPeriodo.p4.push({ estId, nota: promEstP4 }); promediosGrupoAcumulador.p4.suma += promEstP4; promediosGrupoAcumulador.p4.count++; }
    }

    const asignarPuestos = (arregloPeriodo, campoPeriodo) => {
        arregloPeriodo.sort((a, b) => b.nota - a.nota);
        arregloPeriodo.forEach((item, index) => { rankingEstudiantes[item.estId].puestos[campoPeriodo] = index + 1; });
    };

    asignarPuestos(promediosPorPeriodo.p1, 'p1');
    asignarPuestos(promediosPorPeriodo.p2, 'p2');
    asignarPuestos(promediosPorPeriodo.p3, 'p3');
    asignarPuestos(promediosPorPeriodo.p4, 'p4');

    const promediosGrupo = {
        p1: promediosGrupoAcumulador.p1.count > 0 ? parseFloat((promediosGrupoAcumulador.p1.suma / promediosGrupoAcumulador.p1.count).toFixed(2)) : null,
        p2: promediosGrupoAcumulador.p2.count > 0 ? parseFloat((promediosGrupoAcumulador.p2.suma / promediosGrupoAcumulador.p2.count).toFixed(2)) : null,
        p3: promediosGrupoAcumulador.p3.count > 0 ? parseFloat((promediosGrupoAcumulador.p3.suma / promediosGrupoAcumulador.p3.count).toFixed(2)) : null,
        p4: promediosGrupoAcumulador.p4.count > 0 ? parseFloat((promediosGrupoAcumulador.p4.suma / promediosGrupoAcumulador.p4.count).toFixed(2)) : null
    };

    return { promediosGrupo, rankingEstudiantes };
}

// Función para cargar el logo institucional y convertirlo a Base64 para incrustarlo en el PDF
async function _obtenerLogoBase64() {
    try {
        const logoPath = path.join(__dirname, '../../public/uploads/institucional/escudo-instecau.png');
        const imageBuffer = await fs.readFile(logoPath);
        const ext = path.extname(logoPath).substring(1);
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.warn("⚠️ No se pudo cargar el logo para el PDF.");
        return "";
    }
}