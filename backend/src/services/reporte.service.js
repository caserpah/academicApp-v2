import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { reporteRepository } from "../repositories/reporte.repository.js";
import { pdfService } from "./pdf.service.js";
import XlsxPopulate from 'xlsx-populate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const reporteService = {

    async generarSabanaPdf({ grupoId, tipoSabana, asignaturaId, periodo, usuario, vigenciaId }) {

        // Buscamos el año lectivo en la base de datos
        const vigencia = await reporteRepository.findVigenciaById(vigenciaId);
        if (!vigencia) throw new Error("EL año lectivo seleccionado no existe.");

        const grupo = await reporteRepository.findGrupoConDetalles(grupoId, vigencia.id);
        if (!grupo) throw new Error("El grupo seleccionado no existe.");

        const colegio = await reporteRepository.findColegio();
        const logoBase64 = await _obtenerLogoBase64();

        // Extraer estudiantes activos
        const matriculas = await reporteRepository.findMatriculasActivas(grupoId, vigencia.id);
        if (matriculas.length === 0) throw new Error("No hay estudiantes activos en este grupo.");
        const idsEstudiantes = matriculas.map(m => m.estudiante.id);

        let contextoHbs = {
            nombreInstitucion: colegio ? colegio.nombre : "INSTITUCIÓN EDUCATIVA",
            urlEscudo: logoBase64,
            sedeNombre: grupo.sede.nombre,
            gradoNombre: (grupo.grado.nombre || '').replace(/_/g, ' '),
            grupoNombre: grupo.nombre,
            jornada: grupo.jornada === 'MANANA' ? 'MAÑANA' : grupo.jornada,
            anioLectivo: vigencia.anio,
        };

        // ====================================================================
        // LÓGICA: SÁBANA DE ASIGNATURA POR PERIODO
        // ====================================================================
        if (tipoSabana === 'SABANA_ASIGNATURA') {
            const asignatura = await reporteRepository.findAsignaturaConArea(asignaturaId);
            const docente = await reporteRepository.findDocenteDeCarga(grupoId, asignaturaId, vigencia.id);
            const calificaciones = await reporteRepository.findCalificacionesHistoricas(idsEstudiantes, asignaturaId, vigencia.id);

            // Mapeo rápido de notas por estudiante y periodo
            // { estId: { p1: 4.0, p2: 3.5, ... } }
            const diccionarioNotas = {};
            calificaciones.forEach(c => {
                if (!diccionarioNotas[c.estudianteId]) diccionarioNotas[c.estudianteId] = {};
                diccionarioNotas[c.estudianteId][`p${c.periodo}`] = parseFloat(c.notaDefinitiva);
            });

            // Variables para estadísticas (Nro y Porcentajes)
            let tot = { p1: 0, p2: 0, p3: 0, p4: 0, ac: 0 };
            let perd = { p1: 0, p2: 0, p3: 0, p4: 0, ac: 0 };

            // Procesamos filas
            const filasEstudiantes = matriculas.map((m, index) => {
                const est = m.estudiante;
                const notas = diccionarioNotas[est.id] || {};

                const n1 = notas.p1 || null;
                const n2 = notas.p2 || null;
                const n3 = notas.p3 || null;
                const n4 = notas.p4 || null;

                // Cálculo del Acumulado
                let suma = 0; let divisor = 0;
                if (n1 !== null) { suma += n1; divisor++; tot.p1++; if (n1 < 3.0) perd.p1++; }
                if (n2 !== null) { suma += n2; divisor++; tot.p2++; if (n2 < 3.0) perd.p2++; }
                if (n3 !== null) { suma += n3; divisor++; tot.p3++; if (n3 < 3.0) perd.p3++; }
                if (n4 !== null) { suma += n4; divisor++; tot.p4++; if (n4 < 3.0) perd.p4++; }

                // Promedio: suma / periodos cursados (o dividido 4)
                const promedio = divisor > 0 ? (suma / divisor) : null;
                if (suma > 0) {
                    tot.ac++;
                    if (suma < divisor * 3.0) perd.ac++;
                }

                const formatNota = (val, min = 3.0) => {
                    if (val === null) return { nota: "-", esBaja: false };
                    return {
                        nota: val.toFixed(2).replace('.', ','),
                        esBaja: val < min
                    };
                };

                return {
                    numero: (index + 1).toString().padStart(2, '0'),
                    nombreCompleto: `${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`.trim(),
                    estado: 'Activo',
                    p1: formatNota(n1),
                    p2: formatNota(n2),
                    p3: formatNota(n3),
                    p4: formatNota(n4),
                    acumulado: suma > 0 ? formatNota(suma, divisor * 3.0) : { nota: "-", esBaja: false },
                    promedio: promedio !== null ? formatNota(promedio) : { nota: "-", esBaja: false }
                };
            });

            // Función para formatear estadísticas "Nro (XX.X%)"
            const formatStat = (total, perdidos, isAprueban) => {
                if (total === 0) return "-";
                const num = isAprueban ? (total - perdidos) : perdidos;
                const porc = ((num / total) * 100).toFixed(1);
                return `${num} (${porc}%)`;
            };

            // Llenamos el contexto específico para esta plantilla
            contextoHbs.areaAsignatura = `${asignatura.area.nombre} (${asignatura.nombre})`;
            contextoHbs.docenteNombre = docente ? `${docente.identidad?.nombre} ${docente.identidad?.apellidos}`.toUpperCase() : "SIN ASIGNAR";
            contextoHbs.estudiantes = filasEstudiantes;

            contextoHbs.stats = {
                aprueban: {
                    p1: formatStat(tot.p1, perd.p1, true), p2: formatStat(tot.p2, perd.p2, true),
                    p3: formatStat(tot.p3, perd.p3, true), p4: formatStat(tot.p4, perd.p4, true),
                    ac: formatStat(tot.ac, perd.ac, true)
                },
                reprueban: {
                    p1: formatStat(tot.p1, perd.p1, false), p2: formatStat(tot.p2, perd.p2, false),
                    p3: formatStat(tot.p3, perd.p3, false), p4: formatStat(tot.p4, perd.p4, false),
                    ac: formatStat(tot.ac, perd.ac, false)
                }
            };

            // Delegamos al PDF service
            return await pdfService.crearPdfSabanas(contextoHbs, 'sabana-asignatura.hbs');
        }

        // ========================================================================
        // LÓGICA: SÁBANA DE NOTAS DE ÁREAS POR PERIODO (INCLUYE PERIODO 5 / FINAL)
        // ========================================================================
        if (tipoSabana === 'SABANA_AREAS') {
            if (!periodo) throw new Error("Debe seleccionar un periodo para generar este reporte.");

            // REGLA DE SEGURIDAD: Solo el director de grupo (o un Admin) puede ver la sábana de todas las áreas
            const docente = await reporteRepository.findDocentePorUsuarioId(usuario.id);
            if (usuario.role === 'docente' && (!docente || grupo.directorId !== docente.id)) {
                throw new Error("Acceso denegado. Solo el director de grupo puede generar la Sábana de Áreas.");
            }

            const esPeriodoFinal = Number(periodo) === 5;
            const idsMatriculas = matriculas.map(m => m.id);
            const cargas = await reporteRepository.findCargasConAreaPorGrupo(grupoId, vigencia.id);

            const areasMap = new Map();
            cargas.forEach(c => {
                if (c.asignatura && c.asignatura.area) areasMap.set(c.asignatura.area.id, c.asignatura.area);
            });

            let notasFinalesMap = {}; // matriculaId -> areaId -> notaDefinitiva
            let nivelacionesMap = {}; // matriculaId -> ['MAT 3.0', 'ESP']
            let notasProcesadas = {};

            if (esPeriodoFinal) {
                const gradoNombreUpper = (grupo.grado?.nombre || '').toUpperCase().replace(/_/g, ' ');
                const esCicloV = grupo.grado?.codigo === 'C5' ||
                    (gradoNombreUpper.includes('CICLO V') && !gradoNombreUpper.includes('CICLO VI'));
                const periodoCierre = esCicloV ? 3 : 5;

                // 1. Verificar que existan registros consolidados en calificaciones_areas
                const calificacionesAreas = await reporteRepository.findCalificacionesAreasFinales(idsMatriculas, vigencia.id, periodoCierre);
                if (!calificacionesAreas || calificacionesAreas.length === 0) {
                    throw new Error("El grupo seleccionado aún no tiene registros consolidados de calificaciones. Dirijase al motor de promoción y genere los consolidados para el grupo.");
                }

                calificacionesAreas.forEach(ca => {
                    if (ca.area && !areasMap.has(ca.area.id)) {
                        areasMap.set(ca.area.id, ca.area);
                    }
                    if (!notasFinalesMap[ca.matriculaId]) notasFinalesMap[ca.matriculaId] = {};
                    notasFinalesMap[ca.matriculaId][ca.areaId] = parseFloat(ca.notaDefinitiva);
                });

                // 2. Consultar nivelaciones de las matrículas del grupo
                const nivelaciones = await reporteRepository.findNivelacionesPorMatriculas(idsMatriculas, vigencia.id);
                nivelaciones.forEach(niv => {
                    if (!nivelacionesMap[niv.matriculaId]) nivelacionesMap[niv.matriculaId] = [];
                    if (nivelacionesMap[niv.matriculaId].length >= 2) return; // Máximo 2 áreas

                    const nombreBase = (niv.area?.abreviatura || niv.area?.nombre || '').trim();
                    const abrev3 = nombreBase.substring(0, 3).toUpperCase();

                    if (niv.estadoFinal === 'PENDIENTE' || niv.notaNivelacion === null || niv.notaNivelacion === undefined) {
                        nivelacionesMap[niv.matriculaId].push(abrev3);
                    } else {
                        const notaMostrar = niv.notaFinalLegal !== null && niv.notaFinalLegal !== undefined
                            ? Number(niv.notaFinalLegal)
                            : Number(niv.notaNivelacion);
                        nivelacionesMap[niv.matriculaId].push(`${abrev3} ${notaMostrar.toFixed(1)}`);
                    }
                });
            } else {
                const calificaciones = await reporteRepository.findCalificacionesHistoricas(idsEstudiantes, null, vigencia.id);
                notasProcesadas = _procesarNotasPorArea(calificaciones, cargas);
            }

            const areasList = Array.from(areasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

            // Variables para las estadísticas al pie de la página
            let apruebanPorArea = {};
            let repruebanPorArea = {};
            let totalEvaluadosPorArea = {};
            areasList.forEach(a => {
                apruebanPorArea[a.id] = 0;
                repruebanPorArea[a.id] = 0;
                totalEvaluadosPorArea[a.id] = 0;
            });
            let tresOMasPerdidasCount = 0;

            const filasEstudiantes = matriculas.map((m, index) => {
                const est = m.estudiante;
                const areasEstudiante = notasProcesadas[est.id] || {};
                const areasFinalesEst = notasFinalesMap[m.id] || {};
                const recupsEst = nivelacionesMap[m.id] || [];

                let sumaPromedios = 0;
                let areasEvaluadas = 0;
                let nroAp = 0;

                const notasAreasFila = areasList.map(area => {
                    let notaEvaluada = null;

                    if (esPeriodoFinal) {
                        notaEvaluada = areasFinalesEst[area.id] !== undefined && !isNaN(areasFinalesEst[area.id])
                            ? areasFinalesEst[area.id]
                            : null;
                    } else {
                        const areaData = areasEstudiante[area.id];
                        notaEvaluada = areaData && areaData[`countP${periodo}`] > 0 ? areaData[`p${periodo}`] : null;
                    }

                    if (notaEvaluada !== null) {
                        const notaRedondeada = Math.round(notaEvaluada * 100) / 100;
                        sumaPromedios += notaRedondeada;
                        areasEvaluadas++;
                        totalEvaluadosPorArea[area.id]++;

                        if (notaRedondeada < 3.0) {
                            nroAp++;
                            repruebanPorArea[area.id]++;
                        } else {
                            apruebanPorArea[area.id]++;
                        }
                        return {
                            nota: notaRedondeada.toFixed(2).replace('.', ','),
                            esBaja: notaRedondeada < 3.0
                        };
                    }
                    return { nota: "-", esBaja: false };
                });

                if (nroAp >= 3) tresOMasPerdidasCount++;
                const prom = areasEvaluadas > 0 ? (sumaPromedios / areasEvaluadas) : 0;

                let promTexto = prom > 0 ? prom.toFixed(2).replace('.', ',') : "";
                let promColor = "#0f172a";

                if (esPeriodoFinal && areasEvaluadas > 0) {
                    if (nroAp === 0) {
                        promTexto = "APR";
                        promColor = "#047857"; // Verde (Aprobado)
                    } else if (nroAp <= 2) {
                        promTexto = "NIV";
                        promColor = "#b45309"; // Ámbar (Nivelación)
                    } else {
                        promTexto = "REP";
                        promColor = "#b91c1c"; // Rojo (Reprobado)
                    }
                }

                const puedeRecuperar = nroAp > 0 && nroAp < 3;

                return {
                    id: est.id,
                    numero: (index + 1).toString().padStart(2, '0'),
                    nombreCompleto: `${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`.trim(),
                    estado: 'Activo',
                    notasAreas: notasAreasFila,
                    suma: sumaPromedios > 0 ? sumaPromedios.toFixed(2).replace('.', ',') : "",
                    prom: promTexto,
                    promColor: promColor,
                    promRaw: prom,
                    nroAp: nroAp,
                    recup1: puedeRecuperar ? (recupsEst[0] || "") : "",
                    recup2: puedeRecuperar ? (recupsEst[1] || "") : ""
                };
            });

            // Calcular Puesto (Ranking)
            const ranking = [...filasEstudiantes].sort((a, b) => b.promRaw - a.promRaw);
            ranking.forEach((r, idx) => {
                const original = filasEstudiantes.find(f => f.id === r.id);
                if (original) original.puesto = original.promRaw > 0 ? idx + 1 : "";
            });

            const formatStatPorc = (count, total) => total > 0 ? `${count} (${((count / total) * 100).toFixed(1)}%)` : "-";

            contextoHbs.periodo = periodo;
            contextoHbs.esPeriodoFinal = esPeriodoFinal;
            contextoHbs.directorNombre = grupo.director ? `${grupo.director.identidad?.nombre} ${grupo.director.identidad?.apellidos}`.toUpperCase() : "SIN ASIGNAR";
            contextoHbs.areas = areasList.map(a => a.abreviatura);
            contextoHbs.estudiantes = filasEstudiantes;

            // Inyectamos las estadísticas
            contextoHbs.aprueban = areasList.map(a => formatStatPorc(apruebanPorArea[a.id], totalEvaluadosPorArea[a.id]));
            contextoHbs.reprueban = areasList.map(a => formatStatPorc(repruebanPorArea[a.id], totalEvaluadosPorArea[a.id]));
            contextoHbs.tresOMasPerdidas = tresOMasPerdidasCount;

            return await pdfService.crearPdfSabanas(contextoHbs, 'sabana-areas-periodo.hbs');
        }

        // ====================================================================
        // LÓGICA: SÁBANA DE ACUMULADOS POR ÁREA
        // ====================================================================
        if (tipoSabana === 'SABANA_ACUMULADOS') {
            const docente = await reporteRepository.findDocentePorUsuarioId(usuario.id);
            if (usuario.role === 'docente' && (!docente || grupo.directorId !== docente.id)) {
                throw new Error("Acceso denegado. Solo el director de grupo puede generar la Sábana de Acumulados.");
            }

            const cargas = await reporteRepository.findCargasConAreaPorGrupo(grupoId, vigencia.id);
            const calificaciones = await reporteRepository.findCalificacionesHistoricas(idsEstudiantes, null, vigencia.id);

            const areasMap = new Map();
            cargas.forEach(c => {
                if (c.asignatura && c.asignatura.area) areasMap.set(c.asignatura.area.id, c.asignatura.area);
            });
            const areasList = Array.from(areasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

            const notasProcesadas = _procesarNotasPorArea(calificaciones, cargas);

            let apruebanPorArea = {};
            let repruebanPorArea = {};
            let totalEvaluadosPorArea = {};
            areasList.forEach(a => {
                apruebanPorArea[a.id] = 0;
                repruebanPorArea[a.id] = 0;
                totalEvaluadosPorArea[a.id] = 0;
            });

            // LÓGICA DE CICLOS: Identificamos de qué ciclo es el grado para filtrar los acumulados
            const gradoNombre = (grupo.grado.nombre || '').toUpperCase().replace(/_/g, ' ');
            const esCicloV = gradoNombre.includes('CICLO V') && !gradoNombre.includes('CICLO VI');
            const esCicloVI = gradoNombre.includes('CICLO VI');

            const filasEstudiantes = matriculas.map((m, index) => {
                const est = m.estudiante;
                const areasEstudiante = notasProcesadas[est.id] || {};

                const acumuladosAreasFila = areasList.map(area => {
                    const areaData = areasEstudiante[area.id];
                    if (areaData) {
                        let suma = 0;
                        let count = 0; // Para la columna 'N' (Periodos evaluados)

                        // Aplicamos la lógica de suma según el ciclo del grado
                        if (esCicloV) {
                            if (areaData.countP1 > 0) { suma += areaData.p1; count++; }
                            if (areaData.countP2 > 0) { suma += areaData.p2; count++; }
                        } else if (esCicloVI) {
                            if (areaData.countP3 > 0) { suma += areaData.p3; count++; }
                            if (areaData.countP4 > 0) { suma += areaData.p4; count++; }
                        } else {
                            // Grados regulares (suman los 4 periodos)
                            if (areaData.countP1 > 0) { suma += areaData.p1; count++; }
                            if (areaData.countP2 > 0) { suma += areaData.p2; count++; }
                            if (areaData.countP3 > 0) { suma += areaData.p3; count++; }
                            if (areaData.countP4 > 0) { suma += areaData.p4; count++; }
                        }

                        if (count > 0) {
                            totalEvaluadosPorArea[area.id]++;
                            // REGLA: Si la suma acumulada es menor que n * 3.0 = Reprueba
                            const esBaja = suma < (count * 3.0);

                            if (esBaja) repruebanPorArea[area.id]++;
                            else apruebanPorArea[area.id]++;

                            return {
                                suma: (Math.round(suma * 100) / 100).toFixed(2).replace('.', ','),
                                n: count,
                                esBaja: esBaja
                            };
                        }
                    }
                    return { suma: "-", n: "-", esBaja: false };
                });

                return {
                    numero: (index + 1).toString().padStart(2, '0'),
                    nombreCompleto: `${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`.trim(),
                    estado: 'Activo',
                    acumuladoEstudiante: true,
                    acumulados: acumuladosAreasFila
                };
            });

            const formatStatPorc = (count, total) => total > 0 ? `${count} (${((count / total) * 100).toFixed(1)}%)` : "-";

            contextoHbs.directorNombre = grupo.director ? `${grupo.director.identidad?.nombre} ${grupo.director.identidad?.apellidos}`.toUpperCase() : "SIN ASIGNAR";
            contextoHbs.areas = areasList.map(a => a.abreviatura);
            contextoHbs.estudiantes = filasEstudiantes;

            contextoHbs.aprueban = areasList.map(a => formatStatPorc(apruebanPorArea[a.id], totalEvaluadosPorArea[a.id]));
            contextoHbs.reprueban = areasList.map(a => formatStatPorc(repruebanPorArea[a.id], totalEvaluadosPorArea[a.id]));

            return await pdfService.crearPdfSabanas(contextoHbs, 'sabana-acumulados.hbs');
        }
        throw new Error("El tipo de Sábana solicitado no es válido.");
    },

    async generarSabanaExcel({ grupoId, tipoSabana, periodo, vigenciaId, grupoNombre }) {
        if (tipoSabana !== 'SABANA_AREAS' && tipoSabana !== 'SABANA_ACUMULADOS') {
            throw new Error("El formato Excel solo está disponible para Áreas y Acumulados.");
        }

        // 1. Obtener los datos
        const vigencia = await reporteRepository.findVigenciaById(vigenciaId);
        const grupo = await reporteRepository.findGrupoConDetalles(grupoId, vigencia.id);
        const matriculas = await reporteRepository.findMatriculasActivas(grupoId, vigencia.id);
        if (matriculas.length === 0) throw new Error("No hay estudiantes activos en este grupo.");
        const idsEstudiantes = matriculas.map(m => m.estudiante.id);
        const idsMatriculas = matriculas.map(m => m.id);

        const esPeriodoFinal = tipoSabana === 'SABANA_AREAS' && Number(periodo) === 5;
        const cargas = await reporteRepository.findCargasConAreaPorGrupo(grupoId, vigencia.id);

        const areasMap = new Map();
        cargas.forEach(c => {
            if (c.asignatura && c.asignatura.area) areasMap.set(c.asignatura.area.id, c.asignatura.area);
        });

        let notasFinalesMap = {};
        let notasProcesadas = {};

        if (esPeriodoFinal) {
            const gradoNombreUpper = (grupo.grado?.nombre || '').toUpperCase().replace(/_/g, ' ');
            const esCicloV = grupo.grado?.codigo === 'C5' ||
                (gradoNombreUpper.includes('CICLO V') && !gradoNombreUpper.includes('CICLO VI'));
            const periodoCierre = esCicloV ? 3 : 5;

            const calificacionesAreas = await reporteRepository.findCalificacionesAreasFinales(idsMatriculas, vigencia.id, periodoCierre);
            if (!calificacionesAreas || calificacionesAreas.length === 0) {
                throw new Error("El grupo seleccionado aún no tiene registros consolidados de calificaciones. Dirijase al motor de promoción y genere los consolidados para el grupo.");
            }

            calificacionesAreas.forEach(ca => {
                if (ca.area && !areasMap.has(ca.area.id)) areasMap.set(ca.area.id, ca.area);
                if (!notasFinalesMap[ca.matriculaId]) notasFinalesMap[ca.matriculaId] = {};
                notasFinalesMap[ca.matriculaId][ca.areaId] = parseFloat(ca.notaDefinitiva);
            });
        } else {
            const calificaciones = await reporteRepository.findCalificacionesHistoricas(idsEstudiantes, null, vigencia.id);
            notasProcesadas = _procesarNotasPorArea(calificaciones, cargas);
        }

        const areasList = Array.from(areasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

        // Inicializamos contadores para las estadísticas
        let repruebanPorArea = {};
        let totalEvaluadosPorArea = {};
        areasList.forEach(a => {
            repruebanPorArea[a.id] = 0;
            totalEvaluadosPorArea[a.id] = 0;
        });

        // Variables de Ciclos para Acumulados
        const gradoNombre = (grupo.grado.nombre || '').toUpperCase().replace(/_/g, ' ');
        const esCicloV = gradoNombre.includes('CICLO V') && !gradoNombre.includes('CICLO VI');
        const esCicloVI = gradoNombre.includes('CICLO VI');

        // 2. Cargamos la plantilla de Excel con xlsx-populate
        const templateName = tipoSabana === 'SABANA_AREAS' ? 'plantilla_sabana_areas.xlsx' : 'plantilla_sabana_acumulados.xlsx';
        const templatePath = path.join(__dirname, `../../public/plantillas/${templateName}`);
        const workbook = await XlsxPopulate.fromFileAsync(templatePath); // Carga asíncrona de la plantilla

        const wsSabana = workbook.sheet('Sabana');

        // 3. Remplazar encabezados (Filas 3 a 6)
        const directorNombre = grupo.director ? `${grupo.director.identidad?.nombre} ${grupo.director.identidad?.apellidos}`.toUpperCase() : "SIN ASIGNAR";
        const jornadaText = grupo.jornada === 'MANANA' ? 'MAÑANA' : grupo.jornada;

        let subtituloPeriodo = 'CONSOLIDADO DE ACUMULADOS';
        if (tipoSabana === 'SABANA_AREAS') {
            subtituloPeriodo = esPeriodoFinal ? 'Periodo Final' : `Periodo Evaluado: ${periodo}`;
        }

        wsSabana.cell('A3').value(subtituloPeriodo);
        wsSabana.cell('A4').value(`Sede: ${grupo.sede.nombre} | Año Lectivo: ${vigencia.anio} | Jornada: ${jornadaText}`);
        wsSabana.cell('A5').value(`Grado: ${gradoNombre} | Grupo: ${grupo.nombre}`);
        wsSabana.cell('A6').value(`Director de Grupo: ${directorNombre}`);

        // 4. Escribir los encabezados de las áreas (Fila 9, desde la Columna C)
        let colIndex = 3; // 3 equivale a la Columna C

        if (tipoSabana === 'SABANA_ACUMULADOS') {
            // Unimos celdas de # y Estudiante porque la cabecera será doble
            wsSabana.range('A8:A9').merged(true).value('#').style({ bold: true, horizontalAlignment: 'center', verticalAlignment: 'center', border: true });
            wsSabana.range('B8:B9').merged(true).value('ESTUDIANTE').style({ bold: true, horizontalAlignment: 'center', verticalAlignment: 'center', border: true });
        }

        areasList.forEach(area => {
            if (tipoSabana === 'SABANA_AREAS') {
                const cell = wsSabana.cell(9, colIndex);
                cell.value(area.abreviatura);
                cell.style({ bold: true, fontColor: '1E293B', fill: 'F1F5F9', horizontalAlignment: 'center', verticalAlignment: 'center', border: true });
                colIndex++;
            } else {
                // ACUMULADOS: Ocupa 2 columnas
                // Fila 8: Nombre del área centrado
                wsSabana.range(8, colIndex, 8, colIndex + 1).merged(true).value(area.abreviatura)
                    .style({ bold: true, fontColor: '1E293B', fill: 'E2E8F0', horizontalAlignment: 'center', border: true });
                // Fila 9: SUM y N
                wsSabana.cell(9, colIndex).value('SUM').style({ bold: true, fontColor: '475569', fill: 'F1F5F9', horizontalAlignment: 'center', border: true });
                wsSabana.cell(9, colIndex + 1).value('N').style({ bold: true, fontColor: '475569', fill: 'F1F5F9', horizontalAlignment: 'center', border: true });
                colIndex += 2;
            }
        });

        // 5. Llenar estudiantes y sus notas (Fila 10 en adelante)
        let currentRow = 10;
        matriculas.forEach((m, index) => {
            const est = m.estudiante;
            const areasEstudiante = notasProcesadas[est.id] || {};
            const areasFinalesEst = notasFinalesMap[m.id] || {};

            wsSabana.cell(currentRow, 1).value(index + 1).style({ border: true, horizontalAlignment: 'center' });
            wsSabana.cell(currentRow, 2).value(`${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`.trim()).style('border', true);

            let colArea = 3;
            areasList.forEach(area => {
                const areaData = areasEstudiante[area.id];
                if (tipoSabana === 'SABANA_AREAS') {
                    const notaPeriodo = esPeriodoFinal
                        ? (areasFinalesEst[area.id] !== undefined && !isNaN(areasFinalesEst[area.id]) ? areasFinalesEst[area.id] : null)
                        : (areaData && areaData[`countP${periodo}`] > 0 ? areaData[`p${periodo}`] : null);

                    const cell = wsSabana.cell(currentRow, colArea).style('border', true).style('horizontalAlignment', 'center');

                    if (notaPeriodo !== null) {
                        const notaRedondeada = Math.round(notaPeriodo * 100) / 100;
                        totalEvaluadosPorArea[area.id]++;
                        if (notaRedondeada < 3.0) {
                            repruebanPorArea[area.id]++;
                            cell.style({ fontColor: 'DC2626', bold: true, fill: 'FFC000' });
                        }
                        cell.value(notaRedondeada).style('numberFormat', '0.00');
                    } else {
                        cell.value("-");
                    }
                    colArea++;
                } else {
                    // LÓGICA ACUMULADOS
                    let suma = 0, count = 0;
                    if (areaData) {
                        if (esCicloV) {
                            if (areaData.countP1 > 0) { suma += areaData.p1; count++; }
                            if (areaData.countP2 > 0) { suma += areaData.p2; count++; }
                        } else if (esCicloVI) {
                            if (areaData.countP3 > 0) { suma += areaData.p3; count++; }
                            if (areaData.countP4 > 0) { suma += areaData.p4; count++; }
                        } else {
                            if (areaData.countP1 > 0) { suma += areaData.p1; count++; }
                            if (areaData.countP2 > 0) { suma += areaData.p2; count++; }
                            if (areaData.countP3 > 0) { suma += areaData.p3; count++; }
                            if (areaData.countP4 > 0) { suma += areaData.p4; count++; }
                        }
                    }

                    const cellSum = wsSabana.cell(currentRow, colArea).style('border', true).style('horizontalAlignment', 'center');
                    const cellN = wsSabana.cell(currentRow, colArea + 1).style('border', true).style('horizontalAlignment', 'center');

                    if (count > 0) {
                        totalEvaluadosPorArea[area.id]++;
                        const esBaja = suma < (count * 3.0);
                        if (esBaja) {
                            repruebanPorArea[area.id]++;
                            cellSum.style({ fontColor: 'DC2626', bold: true, fill: 'FFC000' });
                        }
                        cellSum.value(Math.round(suma * 100) / 100).style('numberFormat', '0.00');
                        cellN.value(count);
                    } else {
                        cellSum.value('-');
                        cellN.value('-');
                    }
                    colArea += 2;
                }
            });
            currentRow++;
        });

        // ---------------------------------------------------------
        // 5.5 Filas de resumen al final (Debajo de estudiantes)
        // ---------------------------------------------------------
        const rowAprob = currentRow;
        const rowReprob = currentRow + 1;

        wsSabana.range(rowAprob, 1, rowAprob, 2).merged(true).value('Estudiantes que aprueban el área:').style({ bold: true, fontColor: '047857', horizontalAlignment: 'right', verticalAlignment: 'center', border: true });
        wsSabana.range(rowReprob, 1, rowReprob, 2).merged(true).value('Estudiantes que reprueban el área:').style({ bold: true, fontColor: 'DC2626', horizontalAlignment: 'right', verticalAlignment: 'center', border: true });

        let colResumen = 3;
        areasList.forEach(area => {
            const reprobados = repruebanPorArea[area.id];
            const evaluados = totalEvaluadosPorArea[area.id];
            const aprobados = evaluados - reprobados;
            const porcAprobados = evaluados > 0 ? ((aprobados / evaluados) * 100).toFixed(1) : "0.0";
            const porcReprobados = evaluados > 0 ? ((reprobados / evaluados) * 100).toFixed(1) : "0.0";

            const txtAprob = `${aprobados}\n(${porcAprobados}%)`;
            const txtReprob = `${reprobados}\n(${porcReprobados}%)`;

            if (tipoSabana === 'SABANA_AREAS') {
                wsSabana.cell(rowAprob, colResumen).value(txtAprob).style({ fontColor: '047857', horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, border: true });
                wsSabana.cell(rowReprob, colResumen).value(txtReprob).style({ fontColor: 'DC2626', horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, border: true });
                colResumen++;
            } else {
                // Acumulados: Fusionamos las 2 columnas del área
                wsSabana.range(rowAprob, colResumen, rowAprob, colResumen + 1).merged(true).value(txtAprob).style({ fontColor: '047857', horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, border: true });
                wsSabana.range(rowReprob, colResumen, rowReprob, colResumen + 1).merged(true).value(txtReprob).style({ fontColor: 'DC2626', horizontalAlignment: 'center', verticalAlignment: 'center', wrapText: true, border: true });
                colResumen += 2;
            }
        });

        wsSabana.row(rowAprob).height(32);
        wsSabana.row(rowReprob).height(32);

        // ---------------------------------------------------------
        // 6. Datos ocultos para las gráficas (Fila 1000, Columna AA)
        // ---------------------------------------------------------
        let statRow = 1001;
        areasList.forEach(area => {
            const reprobados = repruebanPorArea[area.id];
            const evaluados = totalEvaluadosPorArea[area.id];
            const porcentaje = evaluados > 0 ? (reprobados / evaluados) : 0;

            wsSabana.cell(statRow, 27).value(area.abreviatura); // AA
            wsSabana.cell(statRow, 28).value(reprobados);       // AB
            wsSabana.cell(statRow, 29).value(porcentaje).style('numberFormat', '0.0%'); // AC

            statRow++;
        });

        // Ocultamos las filas sobrantes para que la gráfica se ajuste perfecta
        for (let r = statRow; r <= 1030; r++) {
            wsSabana.row(r).hidden(true);
        }

        return await workbook.outputAsync();
    }
};

// =========================================================
// FUNCIONES AUXILIARES PRIVADAS
// =========================================================

async function _obtenerLogoBase64() {
    try {
        const logoPath = path.join(__dirname, '../../public/uploads/institucional/escudo-instecau.png');
        const imageBuffer = await fs.readFile(logoPath);
        const ext = path.extname(logoPath).substring(1);
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        return "";
    }
};

// Procesa las calificaciones de cada estudiante por área, aplicando el peso porcentual de cada asignatura
function _procesarNotasPorArea(calificaciones, cargas) {
    const resultado = {}; // Estructura: estId -> areaId -> { p1, p2, p3, p4, countP1, ... }

    // Mapeamos a qué área pertenece cada asignatura y cuánto pesa
    const asigToArea = {};
    cargas.forEach(c => {
        if (c.asignatura && c.asignatura.area) {
            asigToArea[c.asignaturaId] = {
                areaId: c.asignatura.area.id,
                porcentaje: c.asignatura.porcentual || 100
            };
        }
    });

    calificaciones.forEach(cal => {
        const estId = cal.estudianteId;
        const asigInfo = asigToArea[cal.asignaturaId];
        if (!asigInfo) return; // Si la materia no está en la carga, se ignora

        const { areaId, porcentaje } = asigInfo;
        const periodo = `p${cal.periodo}`;
        const nota = parseFloat(cal.notaDefinitiva);

        if (!resultado[estId]) resultado[estId] = {};
        if (!resultado[estId][areaId]) {
            resultado[estId][areaId] = { p1: 0, p2: 0, p3: 0, p4: 0, countP1: 0, countP2: 0, countP3: 0, countP4: 0 };
        }

        // Se multiplica la nota de la asignatura por su peso porcentual
        if (!isNaN(nota)) {
            resultado[estId][areaId][periodo] += (nota * (porcentaje / 100));
            resultado[estId][areaId][`countP${cal.periodo}`]++;
        }
    });

    return resultado;
}