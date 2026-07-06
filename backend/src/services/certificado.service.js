import { fileURLToPath } from "url";
import fs from "fs/promises";
import path from "path";
import { certificadoRepository } from "../repositories/certificado.repository.js";
import { pdfService } from "./pdf.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Formateador: Limpia los guiones y agrega los parentesis a los ciclos
const formatearGradoYCiclo = (gradoNombre) => {
    if (!gradoNombre) return "";
    const gradoLimpio = gradoNombre.toUpperCase().replace(/_/g, ' '); // Cambia CICLO_III por CICLO III

    if (gradoLimpio.includes('CICLO II') && !gradoLimpio.includes('III')) return 'Ciclo II (Cuarto y Quinto)';
    if (gradoLimpio.includes('CICLO III')) return 'Ciclo III (Sexto y Séptimo)';
    if (gradoLimpio.includes('CICLO IV')) return 'Ciclo IV (Octavo y Noveno)';
    if (gradoLimpio.includes('CICLO V') && !gradoLimpio.includes('VI')) return 'Ciclo V (Décimo)';
    if (gradoLimpio.includes('CICLO VI')) return 'Ciclo VI (Once)';

    return gradoLimpio; // Si es un grado normal (Ej: SEXTO), lo deja intacto
};

// Formateador: De "AYAPEL - CORDOBA" a "Ayapel, Córdoba"
const formatearLugar = (lugar) => {
    if (!lugar) return "";
    return lugar.split('-').map(parte => {
        const p = parte.trim().toLowerCase();
        return p.charAt(0).toUpperCase() + p.slice(1);
    }).join(', ');
};

// Formateador: De "2003-05-11" a "11 de mayo de 2003"
const formatearFechaLarga = (fechaStr) => {
    if (!fechaStr) return "";
    const [year, month, day] = fechaStr.split('-');
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return `${parseInt(day)} de ${meses[parseInt(month) - 1]} de ${year}`.toUpperCase();
};

export const certificadoService = {

    async generarCertificadoMatricula({ matriculaId, iniciaronClases, meses, comportamiento }) {
        const colegio = await certificadoRepository.findColegio();
        if (!colegio) throw new Error("No se encontró la configuración de la institución.");

        const matricula = await certificadoRepository.findMatriculaConDetalles(matriculaId);
        if (!matricula) throw new Error("No se encontró la matrícula solicitada.");

        const estadoActual = matricula.estado ? matricula.estado.toUpperCase() : '';
        if (estadoActual != 'ACTIVA' &&  estadoActual != 'PROMOVIDO' && estadoActual != 'REPROBADO' && estadoActual != 'MATRICULADO') {
            const error = new Error(`No es posible emitir constancia de matrícula. El estado actual del estudiante en el grado seleccionado es: ${estadoActual}.`);
            error.status = 400;
            throw error;
        }

        const est = matricula.estudiante;
        const grado = matricula.grupo.grado;

        // Construcción del nombre completo limpio
        const nombreCompleto = `${est.primerNombre} ${est.segundoNombre || ''} ${est.primerApellido} ${est.segundoApellido || ''}`.replace(/\s+/g, ' ').trim();

        // --- Generar texto de fecha de expedición ---
        const fechaActual = new Date();
        const dia = fechaActual.getDate();
        const nombresMeses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const mesActual = nombresMeses[fechaActual.getMonth()];
        const anio = fechaActual.getFullYear();

        // Formateamos solo el nombre de la ciudad (Ej: AYAPEL -> Ayapel)
        const ciudadFormateada = colegio.ciudad.charAt(0).toUpperCase() + colegio.ciudad.slice(1).toLowerCase();
        const textoExpedicion = `Para constancia se firma en ${ciudadFormateada} el ${dia} de ${mesActual} de ${anio}.`;

        const logoBase64 = await _obtenerLogoBase64();

        // Preparar el contexto totalmente procesado
        const contextoHbs = {
            urlEscudo: logoBase64,
            textoExpedicion: textoExpedicion,
            colegio: {
                nombre: colegio.nombre,
                registroDane: colegio.registroDane,
                email: colegio.email || 'No registrado',
                contacto: colegio.contacto || 'No registrado',
                direccion: colegio.direccion,
                ciudad: formatearLugar(colegio.ciudad),
                departamento: formatearLugar(colegio.departamento),
                resolucion: colegio.resolucion,
                fechaResolucionTexto: formatearFechaLarga(colegio.fechaResolucion),
                director: colegio.director.toUpperCase(),
                ccDirector: colegio.ccDirector,
                secretaria: colegio.secretaria.toUpperCase(),
                ccSecretaria: colegio.ccSecretaria
            },
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
                nombre: matricula.sede.nombre
            },
            vigencia: {
                anio: matricula.vigencia.anio
            },
            opciones: {
                iniciaronClases: iniciaronClases,
                meses: meses || null,
                comportamiento: comportamiento ? comportamiento.toUpperCase() : null
            }
        };

        // Generamos el PDF
        return await pdfService.crearPdfCertificado(contextoHbs, 'certificado-matricula.hbs');
    },

    async generarCertificadoNotas({ matriculaId, periodo }) {
        // 1. Fetch de datos institucionales y de la matrícula
        const colegio = await certificadoRepository.findColegio();
        if (!colegio) throw new Error("Configuración de institución no encontrada.");

        const matricula = await certificadoRepository.findMatriculaConDetalles(matriculaId);
        if (!matricula) throw new Error("Matrícula no encontrada.");

        const estudiante = matricula.estudiante;
        const vigenciaId = matricula.vigenciaId;
        const grupoId = matricula.grupoId;
        const gradoOriginal = matricula.grupo?.grado?.nombre || '';

        // Determinar si es Informe Final (Definitivas)
        const gradoMayus = gradoOriginal.toUpperCase();

        // Identificación estricta e independiente de cada ciclo
        const esCicloVI = gradoMayus.includes('CICLO_VI') || gradoMayus.includes('CICLO VI');
        const esCicloV = !esCicloVI && (gradoMayus.includes('CICLO_V') || gradoMayus.includes('CICLO V'));

        const esInformeFinal = (esCicloV && Number(periodo) === 3) || (Number(periodo) === 5);

        // Validación: Si es informe final, la matrícula debe estar PROMOVIDO o REPROBADO
        if (esInformeFinal) {
            const estadoMat = matricula.estado ? matricula.estado.toUpperCase() : '';
            if (estadoMat !== 'PROMOVIDO' && estadoMat !== 'REPROBADO') {
                const error = new Error(`No es posible generar el certificado final, porque al estudiante aún no se le ha realizado promoción.`);
                error.status = 400;
                throw error;
            }
        }

        const cargas = await certificadoRepository.findCargasParaCertificado(grupoId, vigenciaId);
        const rangosDb = await certificadoRepository.findRangosDesempeno(vigenciaId);
        const rangosDesempeno = rangosDb.map(r => ({
            desde: Number(r.minNota),
            hasta: Number(r.maxNota),
            desempeno: r.desempeno?.nombre || ''
        }));

        let areasFinales = [];
        let nivelacionesFinales = [];
        let notaComportamiento = null;
        let desempeñoComportamiento = "";

        // ====================================================
        // BIFURCACIÓN DE LÓGICA (FINAL VS PERIODO)
        // ====================================================
        if (esInformeFinal) {
            // ==========================================
            // LÓGICA INFORME FINAL (Áreas + Asignaturas Promediadas)
            // ==========================================
            const califAreas = await certificadoRepository.findCalificacionesAreasCertificado(estudiante.id, vigenciaId, periodo);
            const nivelaciones = await certificadoRepository.findNivelacionesCertificado(estudiante.id, vigenciaId);

            if (!califAreas || califAreas.length === 0) {
                const error = new Error(`El estudiante no tiene consolidado final registrado en las áreas.`);
                error.status = 404; throw error;
            }

            // Determinar los periodos operativos según el tipo de ciclo/grado
            let periodosAConsultar = [1, 2, 3, 4];
            if (esCicloV) periodosAConsultar = [1, 2];
            else if (esCicloVI) periodosAConsultar = [3, 4];

            // Consultar las calificaciones de todos los periodos académicos históricos correspondientes
            let todasCalificaciones = [];
            for (const p of periodosAConsultar) {
                const califs = await certificadoRepository.findCalificacionesCertificado(estudiante.id, vigenciaId, p);
                if (califs && califs.length > 0) {
                    todasCalificaciones = todasCalificaciones.concat(califs);
                }
            }

            // Agrupar e implementar el cálculo de promedios por asignatura en memoria
            const diccionarioAsignaturas = {};
            todasCalificaciones.forEach(cal => {
                const areaNombre = (cal.asignatura?.area?.nombre || 'SIN ÁREA').toUpperCase().trim();
                const esComportamiento = areaNombre === 'COMPORTAMIENTO' || areaNombre === 'DISCIPLINA';

                if (esComportamiento) return; // Se gestiona a nivel consolidado de área

                const asigId = cal.asignaturaId;
                if (!diccionarioAsignaturas[asigId]) {
                    diccionarioAsignaturas[asigId] = {
                        asignatura: cal.asignatura,
                        notas: []
                    };
                }
                if (cal.notaDefinitiva !== null && cal.notaDefinitiva !== undefined) {
                    diccionarioAsignaturas[asigId].notas.push(parseFloat(cal.notaDefinitiva));
                }
            });

            const asignaturasPromedios = Object.values(diccionarioAsignaturas).map(item => {
                const notas = item.notas;
                let sumaNotas = 0;
                notas.forEach(n => sumaNotas += n);
                const promedioAsig = notas.length > 0 ? (sumaNotas / notas.length) : 0;

                return {
                    asignaturaId: item.asignatura?.id,
                    areaId: item.asignatura?.areaId,
                    nombreAsignatura: (item.asignatura?.nombre || '').toUpperCase(),
                    promedio: promedioAsig
                };
            });

            areasFinales = califAreas.map(calArea => {
                const areaNombre = (calArea.area?.nombre || 'SIN ÁREA').toUpperCase().trim();
                const esComportamiento = areaNombre === 'COMPORTAMIENTO' || areaNombre === 'DISCIPLINA';

                let desempenoText = "";
                const rango = rangosDesempeno.find(r => calArea.notaDefinitiva >= r.desde && calArea.notaDefinitiva <= r.hasta);
                if (rango) desempenoText = rango.desempeno.toUpperCase();

                if (esComportamiento) {
                    notaComportamiento = calArea.notaDefinitiva;
                    desempeñoComportamiento = desempenoText;
                    return null;
                }

                // Filtrar y estructurar las asignaturas pertenecientes a esta área específica
                const asignaturasDelArea = asignaturasPromedios
                    .filter(asig => asig.areaId === calArea.areaId)
                    .map(asig => {
                        const carga = cargas.find(car => car.asignaturaId === asig.asignaturaId);

                        // Calculamos la matemática de la fórmula
                        const porcentaje = carga?.asignatura?.porcentual || 100;
                        const notaRelativa = asig.promedio * (porcentaje / 100);

                        return {
                            nombreAsignatura: asig.nombreAsignatura,
                            ih: carga?.horas || '',
                            nota: asig.promedio.toFixed(2).replace('.', ','),
                            formulaCalculo: `(${asig.promedio.toFixed(2)} x ${porcentaje}% = ${notaRelativa.toFixed(4)})`
                            //formulaCalculo: '' // El reporte definitivo final no requiere impresión de fórmulas
                        };
                    });

                const ihArea = cargas
                    .filter(c => c.asignatura?.areaId === calArea.areaId)
                    .reduce((sum, c) => sum + (c.horas || 0), 0);

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

            // Estructurar Nivelaciones
            nivelacionesFinales = nivelaciones.map(niv => {
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
            // ==========================================
            // LÓGICA PERIODOS REGULARES (Funcionamiento Estándar)
            // ==========================================
            const califAsignaturasPeriodo = await certificadoRepository.findCalificacionesCertificado(estudiante.id, vigenciaId, periodo);

            if (!califAsignaturasPeriodo || califAsignaturasPeriodo.length === 0) {
                const error = new Error(`El estudiante no tiene calificaciones registradas para el periodo seleccionado`);
                error.status = 404; throw error;
            }

            const diccionarioAreas = {};

            califAsignaturasPeriodo.forEach(cal => {
                const areaNombre = (cal.asignatura?.area?.nombre || 'SIN ÁREA').toUpperCase().trim();
                const asigNombre = (cal.asignatura?.nombre || 'SIN ASIGNATURA').toUpperCase().trim();
                const porcentaje = cal.asignatura?.porcentual || 100;
                const nota = cal.notaDefinitiva || 0;

                const cargaAsig = cargas.find(c => c.asignaturaId === cal.asignaturaId);
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
                let desempenoText = "";
                const rango = rangosDesempeno.find(r => notaLimpia >= r.desde && notaLimpia <= r.hasta);
                if (rango) desempenoText = rango.desempeno.toUpperCase();

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

        // ==========================================
        // TEXTOS LEGALES Y RETORNO DE CONTEXTO HBS
        // ==========================================
        const textoGrado = formatearGradoYCiclo(gradoOriginal);
        const nivelAcademico = DICCIONARIO_NIVELES[matricula.grupo?.grado?.nivelAcademico] || 'Educación Básica/Media';
        const jornadaTexto = matricula.grupo?.jornada?.nombre || 'respectiva';

        const periodosLetras = { 1: "Primero", 2: "Segundo", 3: "Tercero", 4: "Cuarto" };
        const textoPeriodo = esInformeFinal ? "el año lectivo" : `el periodo ${periodosLetras[periodo] || periodo}`;

        const parrafoLegal = `En el año ${matricula.vigencia.anio}, fue matriculado(a) en el grado ${textoGrado} de ${nivelAcademico} y al finalizar ${textoPeriodo} obtuvo los siguientes niveles de desempeño en las distintas áreas de estudio establecidas por la Ley 115 de 1994 y el Plan de Estudio consignado en el PEI de la Institución:`;

        const fechaActual = new Date();
        const nombresMeses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const ciudadFormateada = colegio.ciudad.charAt(0).toUpperCase() + colegio.ciudad.slice(1).toLowerCase();
        const textoExpedicion = `Para constancia se firma en ${ciudadFormateada} el ${fechaActual.getDate()} de ${nombresMeses[fechaActual.getMonth()]} de ${fechaActual.getFullYear()}.`;

        const logoBase64 = await _obtenerLogoBase64();

        const contextoHbs = {
            urlEscudo: logoBase64,
            textoExpedicion,
            parrafoLegal,
            esInformeFinal,
            nivelaciones: nivelacionesFinales,
            tieneNivelaciones: nivelacionesFinales.length > 0,
            colegio: {
                nombre: colegio.nombre,
                registroDane: colegio.registroDane,
                email: colegio.email || '',
                contacto: colegio.contacto || '',
                direccion: colegio.direccion,
                ciudad: formatearLugar(colegio.ciudad),
                departamento: formatearLugar(colegio.departamento),
                resolucion: colegio.resolucion,
                fechaResolucionTexto: formatearFechaLarga(colegio.fechaResolucion),
                director: colegio.director.toUpperCase(),
                ccDirector: colegio.ccDirector,
                secretaria: colegio.secretaria.toUpperCase(),
                ccSecretaria: colegio.ccSecretaria
            },
            estudiante: {
                nombreCompleto: `${estudiante.primerApellido} ${estudiante.segundoApellido || ''} ${estudiante.primerNombre} ${estudiante.segundoNombre || ''}`.trim(),
                tipoDocumento: DICCIONARIO_DOCUMENTOS[estudiante.tipoDocumento] || estudiante.tipoDocumento || 'T.I.',
                documento: estudiante.documento,
                lugarExpedicion: formatearLugar(estudiante.lugarExpedicion)
            },
            matricula: {
                estado: matricula.estado ? matricula.estado.toUpperCase() : 'PROMOVIDO',
                jornada: jornadaTexto.toLowerCase()
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
        };

        return await pdfService.crearPdfCertificado(contextoHbs, 'certificado-notas.hbs');
    }
};

// Función auxiliar para obtener el logo en base64
async function _obtenerLogoBase64() {
    try {
        const logoPath = path.join(__dirname, '../../public/uploads/institucional/escudo-instecau.png');
        const imageBuffer = await fs.readFile(logoPath);
        const ext = path.extname(logoPath).substring(1);
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.warn("⚠️ No se pudo cargar el logo para el certificado.");
        return "";
    }
}