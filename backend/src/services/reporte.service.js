import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { reporteRepository } from "../repositories/reporte.repository.js";
import { pdfService } from "./pdf.service.js";

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

        // ====================================================================
        // LÓGICA: SÁBANA DE NOTAS DE ÁREAS POR PERIODO
        // ====================================================================
        if (tipoSabana === 'SABANA_AREAS') {
            if (!periodo) throw new Error("Debe seleccionar un periodo para generar este reporte.");

            // REGLA DE SEGURIDAD: Solo el director de grupo (o un Admin) puede ver la sábana de todas las áreas
            const docente = await reporteRepository.findDocentePorUsuarioId(usuario.id);
            if (usuario.role === 'docente' && (!docente || grupo.directorId !== docente.id)) {
                throw new Error("Acceso denegado. Solo el director de grupo puede generar la Sábana de Áreas.");
            }

            const cargas = await reporteRepository.findCargasConAreaPorGrupo(grupoId, vigencia.id);
            // Mandamos 'null' en el asignaturaId para que traiga TODAS las materias del estudiante
            const calificaciones = await reporteRepository.findCalificacionesHistoricas(idsEstudiantes, null, vigencia.id);

            // Extraemos las áreas únicas para armar las columnas dinámicas
            const areasMap = new Map();
            cargas.forEach(c => {
                if (c.asignatura && c.asignatura.area) areasMap.set(c.asignatura.area.id, c.asignatura.area);
            });
            const areasList = Array.from(areasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));

            // Procesamos las matemáticas
            const notasProcesadas = _procesarNotasPorArea(calificaciones, cargas);

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

                let sumaPromedios = 0;
                let areasEvaluadas = 0;
                let nroAp = 0;

                const notasAreasFila = areasList.map(area => {
                    const areaData = areasEstudiante[area.id];
                    const notaPeriodo = areaData && areaData[`countP${periodo}`] > 0 ? areaData[`p${periodo}`] : null;

                    if (notaPeriodo !== null) {
                        const notaRedondeada = Math.round(notaPeriodo * 100) / 100;
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

                return {
                    id: est.id, // Oculto, usado para el ranking
                    numero: (index + 1).toString().padStart(2, '0'),
                    nombreCompleto: `${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`.trim(),
                    estado: 'Activo',
                    notasAreas: notasAreasFila,
                    suma: sumaPromedios > 0 ? sumaPromedios.toFixed(2).replace('.', ',') : "",
                    prom: prom > 0 ? prom.toFixed(2).replace('.', ',') : "",
                    promRaw: prom, // Usado para ordenar puestos
                    nroAp: nroAp
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

            const formatStatPorc = (count, total) => total > 0 ? `${count} (${((count/total)*100).toFixed(1)}%)` : "-";

            contextoHbs.directorNombre = grupo.director ? `${grupo.director.identidad?.nombre} ${grupo.director.identidad?.apellidos}`.toUpperCase() : "SIN ASIGNAR";
            contextoHbs.areas = areasList.map(a => a.abreviatura);
            contextoHbs.estudiantes = filasEstudiantes;

            contextoHbs.aprueban = areasList.map(a => formatStatPorc(apruebanPorArea[a.id], totalEvaluadosPorArea[a.id]));
            contextoHbs.reprueban = areasList.map(a => formatStatPorc(repruebanPorArea[a.id], totalEvaluadosPorArea[a.id]));

            return await pdfService.crearPdfSabanas(contextoHbs, 'sabana-acumulados.hbs');
        }
        throw new Error("El tipo de Sábana solicitado no es válido.");
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