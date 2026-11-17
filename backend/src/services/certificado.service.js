import { fileURLToPath } from "url";
import fs from "fs/promises";
import path from "path";
import { certificadoRepository } from "../repositories/certificado.repository.js";
import { pdfService } from "./pdf.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caché en memoria para el escudo institucional
let cachedLogoBase64 = null;

const DICCIONARIO_DOCUMENTOS = {
    "RC": "Registro Civil",
    "TI": "Tarjeta de Identidad",
    "CC": "Cédula de Ciudadanía",
    "CE": "Cédula de Extranjería",
    "PA": "Pasaporte",
    "NIP": "Número de Identificación Personal",
    "NUIP": "Número Único de Identificación Personal",
    "NES": "Número Establecido por la Secretaría"
};

const DICCIONARIO_NIVELES = {
    "PREESCOLAR": "Preescolar",
    "PRIMARIA": "Básica Primaria",
    "SECUNDARIA": "Básica Secundaria",
    "MEDIA_ACADEMICA": "Media Académica",
    "MEDIA_TECNICA": "Media Técnica"
};

const MESES_LARGO = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

const ESTADOS_VALIDOS_MATRICULA_INDIVIDUAL = ['ACTIVA', 'PROMOVIDO', 'REPROBADO', 'MATRICULADO'];
const ESTADOS_VALIDOS_MATRICULA_MASIVO = ['ACTIVA', 'MATRICULADO'];

const formatearGradoYCiclo = (gradoNombre) => {
    if (!gradoNombre) return "";
    const gradoLimpio = gradoNombre.toUpperCase().replace(/_/g, ' ');

    if (gradoLimpio.includes('CICLO II') && !gradoLimpio.includes('III')) return 'Ciclo II (Cuarto y Quinto)';
    if (gradoLimpio.includes('CICLO III')) return 'Ciclo III (Sexto y Séptimo)';
    if (gradoLimpio.includes('CICLO IV')) return 'Ciclo IV (Octavo y Noveno)';
    if (gradoLimpio.includes('CICLO V') && !gradoLimpio.includes('VI')) return 'Ciclo V (Décimo)';
    if (gradoLimpio.includes('CICLO VI')) return 'Ciclo VI (Once)';

    return gradoLimpio;
};

const formatearLugar = (lugar) => {
    if (!lugar) return "";
    return lugar.split('-').map(parte => {
        const p = parte.trim().toLowerCase();
        return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(', ');
};

const formatearFechaLarga = (fechaStr) => {
    if (!fechaStr) return "";
    const [year, month, day] = String(fechaStr).split('-');
    return `${parseInt(day, 10)} de ${MESES_LARGO[parseInt(month, 10) - 1]} de ${year}`.toUpperCase();
};

const generarTextoExpedicion = (ciudad) => {
    const fechaActual = new Date();
    const ciudadFormateada = ciudad
        ? ciudad.charAt(0).toUpperCase() + ciudad.slice(1).toLowerCase()
        : '';
    return `Para constancia se firma en ${ciudadFormateada} el ${fechaActual.getDate()} de ${MESES_LARGO[fechaActual.getMonth()]} de ${fechaActual.getFullYear()}.`;
};

const formatearColegioContext = (colegio) => ({
    nombre: colegio.nombre,
    registroDane: colegio.registroDane,
    email: colegio.email || 'No registrado',
    contacto: colegio.contacto || 'No registrado',
    direccion: colegio.direccion,
    ciudad: formatearLugar(colegio.ciudad),
    departamento: formatearLugar(colegio.departamento),
    resolucion: colegio.resolucion,
    fechaResolucionTexto: formatearFechaLarga(colegio.fechaResolucion),
    director: (colegio.director || '').toUpperCase(),
    ccDirector: colegio.ccDirector,
    secretaria: (colegio.secretaria || '').toUpperCase(),
    ccSecretaria: colegio.ccSecretaria
});

const obtenerNombreCompleto = (est, apellidosPrimero = false) => {
    const partes = apellidosPrimero
        ? [est.primerApellido, est.segundoApellido, est.primerNombre, est.segundoNombre]
        : [est.primerNombre, est.segundoNombre, est.primerApellido, est.segundoApellido];
    return partes.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};

/**
 * Construye el contexto Handlebars de constancia de matrícula para un estudiante.
 * Retorna { ok: true, data } o { ok: false, motivo }.
 */
const _construirContextoMatricula = ({
    matricula,
    colegioCtx,
    logoBase64,
    textoExpedicion,
    iniciaronClases,
    meses,
    comportamiento,
    estadosPermitidos
}) => {
    const estadoActual = matricula.estado ? matricula.estado.toUpperCase() : '';
    if (!estadosPermitidos.includes(estadoActual)) {
        return {
            ok: false,
            motivo: `Estado de matrícula no válido para constancia (${estadoActual || 'SIN ESTADO'}).`
        };
    }

    const est = matricula.estudiante;
    const grado = matricula.grupo?.grado;

    if (!est || !grado) {
        return {
            ok: false,
            motivo: 'Datos incompletos de estudiante o grado en la matrícula.'
        };
    }

    const nombreCompleto = obtenerNombreCompleto(est, false);

    return {
        ok: true,
        data: {
            urlEscudo: logoBase64,
            textoExpedicion,
            colegio: colegioCtx,
            estudiante: {
                nombreCompleto: nombreCompleto.toUpperCase(),
                tipoDocumentoTexto: DICCIONARIO_DOCUMENTOS[est.tipoDocumento] || est.tipoDocumento,
                documento: est.documento,
                lugarExpedicionTexto: formatearLugar(est.lugarExpedicion)
            },
            matricula: {
                folio: matricula.folio
            },
            grado: {
                nombre: formatearGradoYCiclo(grado.nombre),
                nivelAcademicoTexto: DICCIONARIO_NIVELES[grado.nivelAcademico] || grado.nivelAcademico
            },
            sede: {
                nombre: matricula.sede?.nombre || ''
            },
            vigencia: {
                anio: matricula.vigencia?.anio || ''
            },
            opciones: {
                iniciaronClases: iniciaronClases === true || String(iniciaronClases).toLowerCase() === 'true',
                meses: meses || null,
                comportamiento: comportamiento ? comportamiento.toUpperCase() : null
            }
        }
    };
};

/**
 * Construye el contexto Handlebars de certificado de notas para un estudiante usando datos pre-indexados.
 * Retorna { ok: true, data } o { ok: false, motivo }.
 */
const _construirContextoNotas = ({
    matricula,
    periodo,
    esInformeFinal,
    esCicloV,
    esCicloVI,
    colegioCtx,
    logoBase64,
    textoExpedicion,
    cargasMap,
    ihPorAreaMap,
    rangosDesempeno,
    calificacionesEst,
    califAreasEst,
    nivelacionesEst
}) => {
    const estudiante = matricula.estudiante;
    const gradoOriginal = matricula.grupo?.grado?.nombre || '';

    if (esInformeFinal) {
        const estadoMat = matricula.estado ? matricula.estado.toUpperCase() : '';
        if (estadoMat !== 'PROMOVIDO' && estadoMat !== 'REPROBADO') {
            return {
                ok: false,
                motivo: `Aún no tiene proceso de promoción (Estado actual: ${estadoMat || 'SIN ESTADO'}).`
            };
        }
    }

    let areasFinales = [];
    let nivelacionesFinales = [];
    let notaComportamiento = null;
    let desempeñoComportamiento = "";

    if (esInformeFinal) {
        if (!califAreasEst || califAreasEst.length === 0) {
            return {
                ok: false,
                motivo: 'Sin consolidado final de áreas registrado.'
            };
        }

        // Agrupar notas de periodos operativos para calcular promedios por asignatura
        const diccionarioAsignaturas = {};
        (calificacionesEst || []).forEach(cal => {
            const areaNombre = (cal.asignatura?.area?.nombre || 'SIN ÁREA').toUpperCase().trim();
            if (areaNombre === 'COMPORTAMIENTO' || areaNombre === 'DISCIPLINA') return;

            const asigId = cal.asignaturaId;
            if (!diccionarioAsignaturas[asigId]) {
                diccionarioAsignaturas[asigId] = {
                    asignatura: cal.asignatura,
                    suma: 0,
                    cantidad: 0
                };
            }
            if (cal.notaDefinitiva !== null && cal.notaDefinitiva !== undefined) {
                diccionarioAsignaturas[asigId].suma += parseFloat(cal.notaDefinitiva);
                diccionarioAsignaturas[asigId].cantidad += 1;
            }
        });

        const asignaturasPorAreaMap = new Map();
        Object.values(diccionarioAsignaturas).forEach(item => {
            const promedioAsig = item.cantidad > 0 ? (item.suma / item.cantidad) : 0;
            const areaId = item.asignatura?.areaId;
            const asigId = item.asignatura?.id;
            const carga = cargasMap.get(asigId);
            const porcentaje = carga?.asignatura?.porcentual || item.asignatura?.porcentual || 100;
            const notaRelativa = promedioAsig * (porcentaje / 100);

            const asigObj = {
                nombreAsignatura: (item.asignatura?.nombre || '').toUpperCase(),
                ih: carga?.horas || '',
                nota: promedioAsig.toFixed(2).replace('.', ','),
                formulaCalculo: `(${promedioAsig.toFixed(2)} x ${porcentaje}% = ${notaRelativa.toFixed(4)})`
            };

            if (!asignaturasPorAreaMap.has(areaId)) {
                asignaturasPorAreaMap.set(areaId, []);
            }
            asignaturasPorAreaMap.get(areaId).push(asigObj);
        });

        areasFinales = califAreasEst.map(calArea => {
            const areaNombre = (calArea.area?.nombre || 'SIN ÁREA').toUpperCase().trim();
            const esComportamiento = areaNombre === 'COMPORTAMIENTO' || areaNombre === 'DISCIPLINA';

            const rango = rangosDesempeno.find(r => calArea.notaDefinitiva >= r.desde && calArea.notaDefinitiva <= r.hasta);
            const desempenoText = rango ? rango.desempeno.toUpperCase() : "";

            if (esComportamiento) {
                notaComportamiento = calArea.notaDefinitiva;
                desempeñoComportamiento = desempenoText;
                return null;
            }

            const asignaturasDelArea = asignaturasPorAreaMap.get(calArea.areaId) || [];
            const ihArea = ihPorAreaMap.get(calArea.areaId) || 0;

            return {
                nombreArea: areaNombre,
                ihArea: ihArea > 0 ? ihArea : '',
                notaArea: calArea.notaDefinitiva.toFixed(2).replace('.', ','),
                desempenoArea: desempenoText,
                asignaturas: asignaturasDelArea,
                mostrarAsignaturas: asignaturasDelArea.length > 1,
                esComportamiento: false
            };
        }).filter(Boolean);

        nivelacionesFinales = (nivelacionesEst || []).map(niv => {
            const rangoNiv = rangosDesempeno.find(r => niv.notaFinalLegal >= r.desde && niv.notaFinalLegal <= r.hasta);
            return {
                nombreArea: (niv.area?.nombre || '').toUpperCase(),
                notaAnterior: niv.notaDefinitivaOriginal.toFixed(2).replace('.', ','),
                notaFinal: niv.notaFinalLegal.toFixed(2).replace('.', ','),
                desempeno: rangoNiv ? rangoNiv.desempeno.toUpperCase() : '',
                aprobado: niv.estadoFinal === 'APROBADO' || niv.estadoFinal === 'NIVELADO'
            };
        });

    } else {
        if (!calificacionesEst || calificacionesEst.length === 0) {
            return {
                ok: false,
                motivo: `Sin calificaciones registradas en el periodo ${periodo}.`
            };
        }

        const diccionarioAreas = {};

        calificacionesEst.forEach(cal => {
            const areaNombre = (cal.asignatura?.area?.nombre || 'SIN ÁREA').toUpperCase().trim();
            const asigNombre = (cal.asignatura?.nombre || 'SIN ASIGNATURA').toUpperCase().trim();
            const porcentaje = cal.asignatura?.porcentual || 100;
            const nota = cal.notaDefinitiva || 0;

            const cargaAsig = cargasMap.get(cal.asignaturaId);
            const ih = cargaAsig?.horas || 0;
            const esComportamiento = areaNombre === 'COMPORTAMIENTO' || areaNombre === 'DISCIPLINA';

            if (esComportamiento) {
                notaComportamiento = nota;
                desempeñoComportamiento = cal.juicioAcademica || "BUENO";
                return;
            }

            if (!diccionarioAreas[areaNombre]) {
                diccionarioAreas[areaNombre] = {
                    nombreArea: areaNombre,
                    notaAreaAcumulada: 0,
                    ihArea: 0,
                    asignaturas: []
                };
            }

            const notaRelativa = nota * (porcentaje / 100);

            diccionarioAreas[areaNombre].asignaturas.push({
                nombreAsignatura: asigNombre,
                ih: ih > 0 ? ih : '',
                nota: nota.toFixed(2).replace('.', ','),
                formulaCalculo: `(${nota.toFixed(2)} x ${porcentaje}% = ${notaRelativa.toFixed(4)})`
            });

            diccionarioAreas[areaNombre].notaAreaAcumulada += notaRelativa;
            diccionarioAreas[areaNombre].ihArea += ih;
        });

        areasFinales = Object.values(diccionarioAreas).map(area => {
            const notaLimpia = Math.round(area.notaAreaAcumulada * 100) / 100;
            const rango = rangosDesempeno.find(r => notaLimpia >= r.desde && notaLimpia <= r.hasta);
            const desempenoText = rango ? rango.desempeno.toUpperCase() : "";

            return {
                nombreArea: area.nombreArea,
                ihArea: area.ihArea > 0 ? area.ihArea : '',
                notaArea: notaLimpia.toFixed(2).replace('.', ','),
                desempenoArea: desempenoText,
                asignaturas: area.asignaturas,
                mostrarAsignaturas: area.asignaturas.length > 1,
                esComportamiento: false
            };
        }).sort((a, b) => a.nombreArea.localeCompare(b.nombreArea));

        if (notaComportamiento !== null) {
            const rangoComp = rangosDesempeno.find(r => notaComportamiento >= r.desde && notaComportamiento <= r.hasta);
            if (rangoComp) desempeñoComportamiento = rangoComp.desempeno.toUpperCase();
        }
    }

    const textoGrado = formatearGradoYCiclo(gradoOriginal);
    const nivelAcademico = DICCIONARIO_NIVELES[matricula.grupo?.grado?.nivelAcademico] || 'Educación Básica/Media';
    const jornadaRaw = typeof matricula.grupo?.jornada === 'string'
        ? matricula.grupo.jornada
        : (matricula.grupo?.jornada?.nombre || 'respectiva');

    const periodosLetras = { 1: "Primero", 2: "Segundo", 3: "Tercero", 4: "Cuarto" };
    const textoPeriodo = esInformeFinal ? "el año lectivo" : `el periodo ${periodosLetras[periodo] || periodo}`;

    const parrafoLegal = `En el año ${matricula.vigencia.anio}, fue matriculado(a) en el grado ${textoGrado} de ${nivelAcademico} y al finalizar ${textoPeriodo} obtuvo los siguientes niveles de desempeño en las distintas áreas de estudio establecidas por la Ley 115 de 1994 y el Plan de Estudio consignado en el PEI de la Institución:`;

    return {
        ok: true,
        data: {
            urlEscudo: logoBase64,
            textoExpedicion,
            parrafoLegal,
            esInformeFinal,
            nivelaciones: nivelacionesFinales,
            tieneNivelaciones: nivelacionesFinales.length > 0,
            colegio: colegioCtx,
            estudiante: {
                nombreCompleto: obtenerNombreCompleto(estudiante, true).toUpperCase(),
                tipoDocumento: DICCIONARIO_DOCUMENTOS[estudiante.tipoDocumento] || estudiante.tipoDocumento || 'T.I.',
                documento: estudiante.documento,
                lugarExpedicion: formatearLugar(estudiante.lugarExpedicion)
            },
            matricula: {
                estado: matricula.estado ? matricula.estado.toUpperCase() : 'PROMOVIDO',
                jornada: jornadaRaw.toLowerCase()
            },
            grado: {
                nombre: textoGrado,
                nivelAcademicoTexto: nivelAcademico
            },
            vigencia: {
                anio: matricula.vigencia.anio
            },
            areas: areasFinales,
            comportamiento: notaComportamiento !== null ? {
                nota: notaComportamiento.toFixed(2).replace('.', ','),
                desempeno: desempeñoComportamiento
            } : null
        }
    };
};

export const certificadoService = {

    // ==========================================================
    // 1. EMISIÓN INDIVIDUAL
    // ==========================================================

    async generarCertificadoMatricula({ matriculaId, iniciaronClases, meses, comportamiento }) {
        const [colegio, matricula, logoBase64] = await Promise.all([
            certificadoRepository.findColegio(),
            certificadoRepository.findMatriculaConDetalles(matriculaId),
            _obtenerLogoBase64()
        ]);

        if (!colegio) throw new Error("No se encontró la configuración de la institución.");
        if (!matricula) throw new Error("No se encontró la matrícula solicitada.");

        const resultado = _construirContextoMatricula({
            matricula,
            colegioCtx: formatearColegioContext(colegio),
            logoBase64,
            textoExpedicion: generarTextoExpedicion(colegio.ciudad),
            iniciaronClases,
            meses,
            comportamiento,
            estadosPermitidos: ESTADOS_VALIDOS_MATRICULA_INDIVIDUAL
        });

        if (!resultado.ok) {
            const estadoActual = matricula.estado ? matricula.estado.toUpperCase() : '';
            const error = new Error(`No es posible emitir constancia de matrícula. El estado actual del estudiante en el grado seleccionado es: ${estadoActual}.`);
            error.status = 400;
            throw error;
        }

        return await pdfService.crearPdfCertificado(resultado.data, 'certificado-matricula.hbs');
    },

    async generarCertificadoNotas({ matriculaId, periodo }) {
        const [colegio, matricula, logoBase64] = await Promise.all([
            certificadoRepository.findColegio(),
            certificadoRepository.findMatriculaConDetalles(matriculaId),
            _obtenerLogoBase64()
        ]);

        if (!colegio) throw new Error("Configuración de institución no encontrada.");
        if (!matricula) throw new Error("Matrícula no encontrada.");

        const estudianteId = matricula.estudiante.id;
        const vigenciaId = matricula.vigenciaId;
        const grupoId = matricula.grupoId;
        const gradoOriginal = matricula.grupo?.grado?.nombre || '';
        const gradoMayus = gradoOriginal.toUpperCase();

        const esCicloVI = gradoMayus.includes('CICLO_VI') || gradoMayus.includes('CICLO VI');
        const esCicloV = !esCicloVI && (gradoMayus.includes('CICLO_V') || gradoMayus.includes('CICLO V'));
        const esInformeFinal = (esCicloV && Number(periodo) === 3) || (Number(periodo) === 5);

        if (esInformeFinal) {
            const estadoMat = matricula.estado ? matricula.estado.toUpperCase() : '';
            if (estadoMat !== 'PROMOVIDO' && estadoMat !== 'REPROBADO') {
                const error = new Error(`No es posible generar el certificado final, porque al estudiante aún no se le ha realizado promoción.`);
                error.status = 400;
                throw error;
            }
        }

        const [cargas, rangosDb] = await Promise.all([
            certificadoRepository.findCargasParaCertificado(grupoId, vigenciaId),
            certificadoRepository.findRangosDesempeno(vigenciaId)
        ]);

        const cargasMap = new Map();
        const ihPorAreaMap = new Map();
        cargas.forEach(c => {
            cargasMap.set(c.asignaturaId, c);
            const areaId = c.asignatura?.areaId;
            if (areaId) {
                ihPorAreaMap.set(areaId, (ihPorAreaMap.get(areaId) || 0) + (c.horas || 0));
            }
        });

        const rangosDesempeno = rangosDb.map(r => ({
            desde: Number(r.minNota),
            hasta: Number(r.maxNota),
            desempeno: r.desempeno?.nombre || ''
        }));

        let calificacionesEst = [];
        let califAreasEst = [];
        let nivelacionesEst = [];

        if (esInformeFinal) {
            let periodosAConsultar = [1, 2, 3, 4];
            if (esCicloV) periodosAConsultar = [1, 2];
            else if (esCicloVI) periodosAConsultar = [3, 4];

            [califAreasEst, nivelacionesEst, calificacionesEst] = await Promise.all([
                certificadoRepository.findCalificacionesAreasCertificado(matricula.id, vigenciaId, periodo),
                certificadoRepository.findNivelacionesCertificado(matricula.id, vigenciaId),
                certificadoRepository.findCalificacionesLote([estudianteId], vigenciaId, periodosAConsultar)
            ]);

            if (!califAreasEst || califAreasEst.length === 0) {
                const error = new Error(`El estudiante no tiene consolidado final registrado en las áreas.`);
                error.status = 404;
                throw error;
            }
        } else {
            calificacionesEst = await certificadoRepository.findCalificacionesCertificado(estudianteId, vigenciaId, periodo);
            if (!calificacionesEst || calificacionesEst.length === 0) {
                const error = new Error(`El estudiante no tiene calificaciones registradas para el periodo seleccionado`);
                error.status = 404;
                throw error;
            }
        }

        const resultado = _construirContextoNotas({
            matricula,
            periodo,
            esInformeFinal,
            esCicloV,
            esCicloVI,
            colegioCtx: formatearColegioContext(colegio),
            logoBase64,
            textoExpedicion: generarTextoExpedicion(colegio.ciudad),
            cargasMap,
            ihPorAreaMap,
            rangosDesempeno,
            calificacionesEst,
            califAreasEst,
            nivelacionesEst
        });

        if (!resultado.ok) {
            const error = new Error(resultado.motivo);
            error.status = 400;
            throw error;
        }

        return await pdfService.crearPdfCertificado(resultado.data, 'certificado-notas.hbs');
    },

    // ==========================================================
    // 2. EMISIÓN MASIVA POR GRUPO
    // ==========================================================

    async generarCertificadosMatriculaMasivo({ grupoId, vigenciaId, iniciaronClases, meses, comportamiento }) {
        const [colegio, matriculas, logoBase64] = await Promise.all([
            certificadoRepository.findColegio(),
            certificadoRepository.findMatriculasPorGrupo(grupoId, vigenciaId),
            _obtenerLogoBase64()
        ]);

        if (!colegio) throw new Error("No se encontró la configuración de la institución.");
        if (!matriculas || matriculas.length === 0) {
            const error = new Error("No se encontraron estudiantes matriculados en el grupo y vigencia seleccionados.");
            error.status = 404;
            throw error;
        }

        const colegioCtx = formatearColegioContext(colegio);
        const textoExpedicion = generarTextoExpedicion(colegio.ciudad);

        const certificados = [];
        const omitidos = [];

        for (const matricula of matriculas) {
            const res = _construirContextoMatricula({
                matricula,
                colegioCtx,
                logoBase64,
                textoExpedicion,
                iniciaronClases,
                meses,
                comportamiento,
                estadosPermitidos: ESTADOS_VALIDOS_MATRICULA_MASIVO
            });

            if (res.ok) {
                certificados.push(res.data);
            } else {
                const est = matricula.estudiante || {};
                omitidos.push({
                    documento: est.documento || 'S/D',
                    nombreCompleto: obtenerNombreCompleto(est, true).toUpperCase(),
                    motivo: res.motivo
                });
            }
        }

        if (certificados.length === 0) {
            const error = new Error("Ningún estudiante del grupo cumple con los requisitos (estado ACTIVA o MATRICULADO) para generar constancia de matrícula.");
            error.status = 400;
            error.omitidos = omitidos;
            throw error;
        }

        const pdfBuffer = await pdfService.crearPdfCertificado({ certificados }, 'certificado-matricula-lote.hbs');

        const primeraMat = matriculas[0];
        return {
            pdfBuffer,
            omitidos,
            totalGenerados: certificados.length,
            grupoInfo: {
                grado: primeraMat.grupo?.grado?.nombre || '',
                grupo: primeraMat.grupo?.nombre || '',
                anio: primeraMat.vigencia?.anio || ''
            }
        };
    },

    async generarCertificadosNotasMasivo({ grupoId, vigenciaId, periodo }) {
        const [colegio, matriculas, cargas, rangosDb, logoBase64] = await Promise.all([
            certificadoRepository.findColegio(),
            certificadoRepository.findMatriculasPorGrupo(grupoId, vigenciaId),
            certificadoRepository.findCargasParaCertificado(grupoId, vigenciaId),
            certificadoRepository.findRangosDesempeno(vigenciaId),
            _obtenerLogoBase64()
        ]);

        if (!colegio) throw new Error("Configuración de institución no encontrada.");
        if (!matriculas || matriculas.length === 0) {
            const error = new Error("No se encontraron estudiantes matriculados en el grupo y vigencia seleccionados.");
            error.status = 404;
            throw error;
        }

        const primeraMat = matriculas[0];
        const gradoOriginal = primeraMat.grupo?.grado?.nombre || '';
        const gradoMayus = gradoOriginal.toUpperCase();

        const esCicloVI = gradoMayus.includes('CICLO_VI') || gradoMayus.includes('CICLO VI');
        const esCicloV = !esCicloVI && (gradoMayus.includes('CICLO_V') || gradoMayus.includes('CICLO V'));
        const esInformeFinal = (esCicloV && Number(periodo) === 3) || (Number(periodo) === 5);

        // Pre-indexar cargas e I.H. por área
        const cargasMap = new Map();
        const ihPorAreaMap = new Map();
        cargas.forEach(c => {
            cargasMap.set(c.asignaturaId, c);
            const areaId = c.asignatura?.areaId;
            if (areaId) {
                ihPorAreaMap.set(areaId, (ihPorAreaMap.get(areaId) || 0) + (c.horas || 0));
            }
        });

        const rangosDesempeno = rangosDb.map(r => ({
            desde: Number(r.minNota),
            hasta: Number(r.maxNota),
            desempeno: r.desempeno?.nombre || ''
        }));

        // Filtrar previamente IDs elegibles para evitar consultas innecesarias
        const matriculasElegibles = [];
        const omitidos = [];

        for (const mat of matriculas) {
            if (esInformeFinal) {
                const estadoMat = mat.estado ? mat.estado.toUpperCase() : '';
                if (estadoMat !== 'PROMOVIDO' && estadoMat !== 'REPROBADO') {
                    const est = mat.estudiante || {};
                    omitidos.push({
                        documento: est.documento || 'S/D',
                        nombreCompleto: obtenerNombreCompleto(est, true).toUpperCase(),
                        motivo: `Aún no tiene proceso de promoción (Estado actual: ${estadoMat || 'SIN ESTADO'}).`
                    });
                    continue;
                }
            }
            matriculasElegibles.push(mat);
        }

        const estudianteIds = matriculasElegibles.map(m => m.estudianteId);
        const matriculaIds = matriculasElegibles.map(m => m.id);

        // Consultas en lote (Batch Queries con Op.in)
        const califsPorEstudianteMap = new Map();
        const califAreasPorMatriculaMap = new Map();
        const nivelacionesPorMatriculaMap = new Map();

        if (matriculasElegibles.length > 0) {
            if (esInformeFinal) {
                let periodosAConsultar = [1, 2, 3, 4];
                if (esCicloV) periodosAConsultar = [1, 2];
                else if (esCicloVI) periodosAConsultar = [3, 4];

                const [todasCalifs, todasCalifAreas, todasNivelaciones] = await Promise.all([
                    certificadoRepository.findCalificacionesLote(estudianteIds, vigenciaId, periodosAConsultar),
                    certificadoRepository.findCalificacionesAreasLote(matriculaIds, vigenciaId, periodo),
                    certificadoRepository.findNivelacionesLote(matriculaIds, vigenciaId)
                ]);

                todasCalifs.forEach(c => {
                    if (!califsPorEstudianteMap.has(c.estudianteId)) califsPorEstudianteMap.set(c.estudianteId, []);
                    califsPorEstudianteMap.get(c.estudianteId).push(c);
                });

                todasCalifAreas.forEach(ca => {
                    if (!califAreasPorMatriculaMap.has(ca.matriculaId)) califAreasPorMatriculaMap.set(ca.matriculaId, []);
                    califAreasPorMatriculaMap.get(ca.matriculaId).push(ca);
                });

                todasNivelaciones.forEach(n => {
                    if (!nivelacionesPorMatriculaMap.has(n.matriculaId)) nivelacionesPorMatriculaMap.set(n.matriculaId, []);
                    nivelacionesPorMatriculaMap.get(n.matriculaId).push(n);
                });
            } else {
                const todasCalifsPeriodo = await certificadoRepository.findCalificacionesLote(estudianteIds, vigenciaId, periodo);
                todasCalifsPeriodo.forEach(c => {
                    if (!califsPorEstudianteMap.has(c.estudianteId)) califsPorEstudianteMap.set(c.estudianteId, []);
                    califsPorEstudianteMap.get(c.estudianteId).push(c);
                });
            }
        }

        const colegioCtx = formatearColegioContext(colegio);
        const textoExpedicion = generarTextoExpedicion(colegio.ciudad);
        const certificados = [];

        for (const matricula of matriculasElegibles) {
            const res = _construirContextoNotas({
                matricula,
                periodo,
                esInformeFinal,
                esCicloV,
                esCicloVI,
                colegioCtx,
                logoBase64,
                textoExpedicion,
                cargasMap,
                ihPorAreaMap,
                rangosDesempeno,
                calificacionesEst: califsPorEstudianteMap.get(matricula.estudianteId) || [],
                califAreasEst: califAreasPorMatriculaMap.get(matricula.id) || [],
                nivelacionesEst: nivelacionesPorMatriculaMap.get(matricula.id) || []
            });

            if (res.ok) {
                certificados.push(res.data);
            } else {
                const est = matricula.estudiante || {};
                omitidos.push({
                    documento: est.documento || 'S/D',
                    nombreCompleto: obtenerNombreCompleto(est, true).toUpperCase(),
                    motivo: res.motivo
                });
            }
        }

        if (certificados.length === 0) {
            const error = new Error("Ningún estudiante del grupo cumple con las condiciones o tiene calificaciones registradas para generar el certificado.");
            error.status = 400;
            error.omitidos = omitidos;
            throw error;
        }

        const pdfBuffer = await pdfService.crearPdfCertificado({ certificados }, 'certificado-notas-lote.hbs');

        return {
            pdfBuffer,
            omitidos,
            totalGenerados: certificados.length,
            grupoInfo: {
                grado: gradoOriginal,
                grupo: primeraMat.grupo?.nombre || '',
                anio: primeraMat.vigencia?.anio || ''
            }
        };
    }
};

async function _obtenerLogoBase64() {
    if (cachedLogoBase64 !== null) return cachedLogoBase64;
    try {
        const logoPath = path.join(__dirname, '../../public/uploads/institucional/escudo-instecau.png');
        const imageBuffer = await fs.readFile(logoPath);
        const ext = path.extname(logoPath).substring(1);
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        cachedLogoBase64 = `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
        return cachedLogoBase64;
    } catch (error) {
        console.warn("⚠️ No se pudo cargar el logo para el certificado.");
        return "";
    }
}