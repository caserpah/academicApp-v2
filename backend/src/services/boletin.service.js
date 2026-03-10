import { error, log } from "console";
import { boletinRepository } from "../repositories/boletin.repository.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Configuración de rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constantes de configuración
const PESOS_DIMENSIONES = {
    academica: 0.50,
    acumulativa: 0.20,
    laboral: 0.15,
    social: 0.15
};

export const boletinService = {

    /**
     * Función principal orquestadora.
     */
    async generarDatosBoletinLote(grupoId, vigenciaId, anioLectivo, periodoActual, tipoBoletinReq, estudianteId) {

        // =========================================================
        // FASE 1: EXTRACCIÓN MASIVA DE DATOS DESDE LA BASE DE DATOS
        // =========================================================
        const { grupo, colegio } = await boletinRepository.findInfoGrupo(grupoId);

        const esPreescolar = grupo.grado.nivelAcademico === 'PREESCOLAR';
        const tipoBoletin = esPreescolar ? 'DESCRIPTIVO' : tipoBoletinReq;

        const rangosDb = await boletinRepository.findRangosDesempeno(vigenciaId);
        const rangosDesempeno = rangosDb.map(r => ({
            desde: r.minNota.toFixed(2),
            hasta: r.maxNota.toFixed(2),
            desempeno: r.desempeno?.nombre || ''
        }));

        // Obtenemos TODOS los estudiantes del grupo
        let matriculasTotales = await boletinRepository.findMatriculasPorGrupo(grupoId, vigenciaId);

        // Excluir a los estudiantes con bloqueo de notas
        matriculasTotales = matriculasTotales.filter(m => m.bloqueo_notas !== true && m.bloqueo_notas !== 1);

        if (!matriculasTotales || matriculasTotales.length === 0) {
            throw new Error("No hay estudiantes matriculados y activos en este grupo.");
        }

        // Extraemos las notas de TODO EL GRUPO para que los promedios y puestos sean
        const idsEstudiantesTotales = matriculasTotales.map(m => m.estudiante.id);
        const cargas = await boletinRepository.findCargasPorGrupo(grupoId, vigenciaId);
        const calificacionesPlanas = await boletinRepository.findCalificacionesHistoricasLote(idsEstudiantesTotales, vigenciaId);

        // Validar que al menos alguien tenga notas en el periodo solicitado
        const tieneNotasPeriodo = calificacionesPlanas.some(cal => Number(cal.periodo) === Number(periodoActual));

        if (!tieneNotasPeriodo && calificacionesPlanas.length > 0) {
            throw new Error(`No hay calificaciones registradas para el periodo y grupo seleccionado. No se puede generar el boletín.`);
        }

        // =========================================================
        // FASE 2: CÁLCULOS EN MEMORIA
        // =========================================================
        const notasAgrupadas = _agruparNotasJerarquia(calificacionesPlanas, cargas, esPreescolar, tipoBoletin, periodoActual);
        const { promediosGrupo, rankingEstudiantes } = _calcularEstadisticasYPuestos(notasAgrupadas, idsEstudiantesTotales);

        // =========================================================
        // FASE 3: ENSAMBLAJE DEL MEGA-OBJETO JSON
        // =========================================================

        // Decidimos a quiénes vamos a generarles el PDF
        let matriculasImprimir = matriculasTotales;
        if (estudianteId) {
            matriculasImprimir = matriculasTotales.filter(m => m.estudiante.id === Number(estudianteId));
        }

        const boletinesGenerados = matriculasImprimir.map(matricula => {
            const estId = matricula.estudiante.id;
            const notasEstudiante = notasAgrupadas[estId] || [];
            const estadisticas = rankingEstudiantes[estId] || {};

            return {
                infoPersonal: {
                    nombreCompleto: `${matricula.estudiante.primerApellido} ${matricula.estudiante.segundoApellido || ''} ${matricula.estudiante.primerNombre} ${matricula.estudiante.segundoNombre || ''}`.trim(),
                    documento: matricula.estudiante.documento,
                    estadoPromocion: matricula.estado
                },
                cuadroHistorico: esPreescolar ? null : {
                    promediosEstudiante: estadisticas.promedios,
                    puestosEstudiante: estadisticas.puestos,
                    // IMPORTANTE: El total es sobre el grupo completo, no sobre los impresos
                    totalEstudiantes: matriculasTotales.length
                },
                areas: notasEstudiante
            };
        });

        const logoBase64 = await _obtenerLogoBase64();

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
                esPreescolar,
            },
            grupo: {
                grado: grupo.grado.nombre,
                grupoNombre: grupo.nombre,
                jornada: grupo.jornada === 'MANANA' ? 'MAÑANA' : grupo.jornada,
                sede: grupo.sede?.nombre ? grupo.sede.nombre.toUpperCase() : 'Sede no asignada',
                directorGrupo: grupo.director ? `${grupo.director.nombre} ${grupo.director.apellidos}` : 'SIN ASIGNAR',
                promedioGrupoHistorico: promediosGrupo
            },
            rangosDesempeno,
            estudiantes: boletinesGenerados
        };
    }
};

// =========================================================
// FUNCIONES AUXILIARES PRIVADAS
// =========================================================

function _agruparNotasJerarquia(calificacionesPlanas, cargas, esPreescolar, tipoBoletin, periodoActual) {
    const diccionario = {};

    calificacionesPlanas.forEach(cal => {
        const estId = cal.estudianteId;
        // Convertimos a mayúsculas por si acaso viene diferente en la BD
        const areaNombre = (cal.asignatura?.area?.nombre || 'SIN ÁREA').toUpperCase().trim();
        const asigNombre = (cal.asignatura?.nombre || 'SIN ASIGNATURA').toUpperCase().trim();
        const porcentaje = cal.asignatura?.porcentual || 100;

        const esComportamiento = areaNombre === 'COMPORTAMIENTO' || areaNombre === 'DISCIPLINA';

        const isPeriodoActual = Number(cal.periodo) === Number(periodoActual);

        if (!diccionario[estId]) diccionario[estId] = {};
        if (!diccionario[estId][areaNombre]) {
            diccionario[estId][areaNombre] = {
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
                docente: cargaAsig?.docente ? `${cargaAsig.docente.nombre} ${cargaAsig.docente.apellidos}` : 'SIN DOCENTE',
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

        // Si es comportamiento, extraemos solo el texto del periodo actual
        if (esComportamiento && isPeriodoActual) {
            asigRef.textoComportamiento = cal.juicioAcademica || "Sin registro descriptivo de comportamiento.";
        }

        // Si NO es comportamiento, calculamos las fórmulas y juicios
        if (tipoBoletin === 'DESCRIPTIVO' && isPeriodoActual && cal.notaDefinitiva !== null && !esComportamiento) {
            if (esPreescolar) {
                asigRef.gruposDimensiones = [
                    {
                        tituloCabecera: "COMPETENCIA ACADÉMICA Y EVALUACIÓN ACUMULATIVA",
                        dimensiones: [
                            { formula: null, juicio: cal.juicioAcademica },
                            { formula: null, juicio: cal.juicioAcumulativa }
                        ].filter(d => d.juicio)
                    },
                    {
                        tituloCabecera: "COMPETENCIAS LABORAL Y SOCIAL",
                        dimensiones: [
                            { formula: null, juicio: cal.juicioLaboral }
                        ].filter(d => d.juicio)
                    }
                ];
            } else {
                // Formateadores estéticos (Solo le dan formato visual de comas, NO calculan nada)
                const formatNota = (num) => num ? Number(num).toFixed(1).replace('.', ',') : "0,0";
                const formatPromedio = (num) => num ? Number(num).toFixed(3).replace('.', ',') : "0,000";

                // Formateador exacto de 2 decimales para la fórmula de la asignatura
                const formatNota2Dec = (num) => num ? Number(num).toFixed(2).replace('.', ',') : "0,00";

                asigRef.gruposDimensiones = [
                    {
                        tituloCabecera: "COMPETENCIA ACADÉMICA Y EVALUACION ACUMULATIVA",
                        dimensiones: [
                            {
                                formula: `${formatNota(cal.notaAcademica)} x 50% = ${formatPromedio(cal.promedioAcademica)}`,
                                juicio: cal.juicioAcademica || "Juicio académico no registrado."
                            },
                            {
                                formula: `${formatNota(cal.notaAcumulativa)} x 20% = ${formatPromedio(cal.promedioAcumulativa)}`,
                                juicio: cal.juicioAcumulativa || "Juicio acumulativo no registrado."
                            }
                        ]
                    },
                    {
                        tituloCabecera: "COMPETENCIAS LABORAL Y SOCIAL",
                        dimensiones: [
                            {
                                formula: `${formatNota(cal.notaLaboral)} x 15% = ${formatPromedio(cal.promedioLaboral)}`,
                                juicio: cal.juicioLaboral || "Juicio laboral no registrado."
                            },
                            {
                                formula: `${formatNota(cal.notaSocial)} x 15% = ${formatPromedio(cal.promedioSocial)}`,
                                juicio: cal.juicioSocial || "Juicio social no registrado."
                            }
                        ]
                    }
                ];

                asigRef.formulaPorcentajeExtra = `Nota ${formatNota2Dec(cal.notaDefinitiva)} x ${porcentaje}% = ${(cal.notaDefinitiva * (porcentaje / 100)).toFixed(4).replace('.', ',')}`;
            }

            if (cal.recomendacionUno) asigRef.recomendaciones.push(cal.recomendacionUno);
            if (cal.recomendacionDos) asigRef.recomendaciones.push(cal.recomendacionDos);
        }
    });

    const resultadoFinal = {};
    for (const estId in diccionario) {
        resultadoFinal[estId] = Object.values(diccionario[estId]).map(area => {
            const listaAsignaturas = Object.values(area.asignaturasObj);
            const esComportamiento = area.esComportamiento;

            // LÓGICA NUEVA: ¿Mostramos el nombre de la asignatura? Solo si hay más de 1
            const mostrarNombreAsignatura = listaAsignaturas.length > 1;

            // Extraemos info de comportamiento para subirla al Área
            let docenteComportamiento = null;
            let textoComportamiento = null;
            if (esComportamiento && listaAsignaturas.length > 0) {
                docenteComportamiento = listaAsignaturas[0].docente;
                textoComportamiento = listaAsignaturas[0].textoComportamiento;
            }

            let acumuladoArea = 0;
            let fallasArea = 0;
            let areaP1 = 0, areaP2 = 0, areaP3 = 0, areaP4 = 0;
            let tieneP1 = false, tieneP2 = false, tieneP3 = false, tieneP4 = false;

            listaAsignaturas.forEach(a => {
                const sumaNotas = (a.notasHistoricas.p1 || 0) + (a.notasHistoricas.p2 || 0) + (a.notasHistoricas.p3 || 0) + (a.notasHistoricas.p4 || 0);
                acumuladoArea += (sumaNotas * (a.porcentajePeso / 100));

                fallasArea += (a.fallas || 0);

                if (a.notasHistoricas.p1 !== null) { areaP1 += (a.notasHistoricas.p1 * (a.porcentajePeso / 100)); tieneP1 = true; }
                if (a.notasHistoricas.p2 !== null) { areaP2 += (a.notasHistoricas.p2 * (a.porcentajePeso / 100)); tieneP2 = true; }
                if (a.notasHistoricas.p3 !== null) { areaP3 += (a.notasHistoricas.p3 * (a.porcentajePeso / 100)); tieneP3 = true; }
                if (a.notasHistoricas.p4 !== null) { areaP4 += (a.notasHistoricas.p4 * (a.porcentajePeso / 100)); tieneP4 = true; }
            });

            // ---------------------------------------------------------
            // APLICAR REGLA DE BENEVOLENCIA AL ÁREA (Calculada en memoria)
            // ---------------------------------------------------------
            const aplicarBenevolencia = (nota) => (nota >= 2.96 && nota < 3.0) ? 3.0 : nota;

            if (tieneP1) areaP1 = aplicarBenevolencia(areaP1);
            if (tieneP2) areaP2 = aplicarBenevolencia(areaP2);
            if (tieneP3) areaP3 = aplicarBenevolencia(areaP3);
            if (tieneP4) areaP4 = aplicarBenevolencia(areaP4);
            // ---------------------------------------------------------

            let metaEsperada = 0;
            if (Number(periodoActual) === 1) metaEsperada = 2.9;
            else if (Number(periodoActual) === 2) metaEsperada = 5.9;
            else if (Number(periodoActual) === 3) metaEsperada = 8.9;
            else if (Number(periodoActual) === 4) metaEsperada = 11.9;

            const estadoGanandoPerdiendo = acumuladoArea > metaEsperada ? 'G' : 'PR';

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
                acumuladoActualArea: acumuladoArea > 0 ? acumuladoArea.toFixed(2) : "",
                estadoGanandoPerdiendo: esPreescolar ? null : estadoGanandoPerdiendo,
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

        const aplicarBenevolencia = (nota) => (nota >= 2.96 && nota < 3.0) ? 3.0 : nota;

        const promEstP1 = countP1 > 0 ? aplicarBenevolencia(parseFloat((sumaP1 / countP1).toFixed(2))) : null;
        const promEstP2 = countP2 > 0 ? aplicarBenevolencia(parseFloat((sumaP2 / countP2).toFixed(2))) : null;
        const promEstP3 = countP3 > 0 ? aplicarBenevolencia(parseFloat((sumaP3 / countP3).toFixed(2))) : null;
        const promEstP4 = countP4 > 0 ? aplicarBenevolencia(parseFloat((sumaP4 / countP4).toFixed(2))) : null;

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