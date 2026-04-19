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

        // 2. Fetch de Notas, Rangos y Cargas
        const calificaciones = await certificadoRepository.findCalificacionesCertificado(estudiante.id, vigenciaId, periodo);
        if (!calificaciones || calificaciones.length === 0) {
            throw new Error(`El estudiante no tiene calificaciones registradas para el periodo seleccionado`);
        }

        const cargas = await certificadoRepository.findCargasParaCertificado(grupoId, vigenciaId);
        const rangosDb = await certificadoRepository.findRangosDesempeno(vigenciaId);

        // 3. Diccionario de Rangos de Desempeño
        const rangosDesempeno = rangosDb.map(r => ({
            desde: Number(r.minNota),
            hasta: Number(r.maxNota),
            desempeno: r.desempeno?.nombre || ''
        }));

        // 4. AGRUPACIÓN Y CÁLCULO MATEMÁTICO
        const diccionarioAreas = {};
        let textoComportamiento = "Bueno"; // Valor por defecto si no se encuentra el comportamiento
        let notaComportamiento = null;
        let desempeñoComportamiento = "";

        calificaciones.forEach(cal => {
            const areaNombre = (cal.asignatura?.area?.nombre || 'SIN ÁREA').toUpperCase().trim();
            const asigNombre = (cal.asignatura?.nombre || 'SIN ASIGNATURA').toUpperCase().trim();
            const porcentaje = cal.asignatura?.porcentual || 100;
            const nota = cal.notaDefinitiva || 0;

            // Buscar la carga para sacar la Intensidad Horaria
            const cargaAsig = cargas.find(c => c.asignaturaId === cal.asignaturaId);
            const ih = cargaAsig?.horas || 0;

            const esComportamiento = areaNombre === 'COMPORTAMIENTO' || areaNombre === 'DISCIPLINA';

            if (esComportamiento) {
                notaComportamiento = nota;
                textoComportamiento = cal.juicioAcademica || "Sin registro";
                return; // Lo tratamos por separado
            }

            if (!diccionarioAreas[areaNombre]) {
                diccionarioAreas[areaNombre] = {
                    nombreArea: areaNombre,
                    notaAreaAcumulada: 0,
                    ihArea: 0,
                    asignaturas: []
                };
            }

            // Cálculos para la asignatura
            const notaRelativa = nota * (porcentaje / 100);

            diccionarioAreas[areaNombre].asignaturas.push({
                nombreAsignatura: asigNombre,
                ih: ih > 0 ? ih : '',
                nota: nota.toFixed(2).replace('.', ','),
                porcentaje: porcentaje,
                formulaCalculo: `(${nota.toFixed(2)} x ${porcentaje}% = ${notaRelativa.toFixed(4)})`
            });

            // Acumulamos para el Área
            diccionarioAreas[areaNombre].notaAreaAcumulada += notaRelativa;
            diccionarioAreas[areaNombre].ihArea += ih;
        });

        // 5. Procesar el resultado final de las Áreas (Calculando el Desempeño)
        const areasFinales = Object.values(diccionarioAreas).map(area => {
            // Evitar problemas de flotantes en JS
            const notaLimpia = Math.round(area.notaAreaAcumulada * 100) / 100;

            // Buscar desempeño del área
            let desempenoText = "";
            const rango = rangosDesempeno.find(r => notaLimpia >= r.desde && notaLimpia <= r.hasta);
            if (rango) desempenoText = rango.desempeno.toUpperCase();

            return {
                nombreArea: area.nombreArea,
                ihArea: area.ihArea > 0 ? area.ihArea : '',
                notaArea: notaLimpia.toFixed(2).replace('.', ','),
                desempenoArea: desempenoText,
                asignaturas: area.asignaturas,
                mostrarAsignaturas: area.asignaturas.length > 1
            };
        }).sort((a, b) => a.nombreArea.localeCompare(b.nombreArea)); // Orden alfabético

        // Desempeño de Comportamiento
        if (notaComportamiento !== null) {
            const rangoComp = rangosDesempeno.find(r => notaComportamiento >= r.desde && notaComportamiento <= r.hasta);
            if (rangoComp) desempeñoComportamiento = rangoComp.desempeno.toUpperCase();
        }

        // 6. GENERACIÓN DEL TEXTO LEGAL
        const gradoOriginal = matricula.grupo.grado.nombre;
        const textoGrado = formatearGradoYCiclo(gradoOriginal);

        const nivelAcademico = DICCIONARIO_NIVELES[matricula.grupo.grado.nivelAcademico] || 'Educación Básica/Media';

        const periodosLetras = { 1: "Primero", 2: "Segundo", 3: "Tercero", 4: "Cuarto" };
        const textoPeriodo = Number(periodo) === 5 ? "el año lectivo" : `el periodo ${periodosLetras[periodo] || periodo}`;

        const parrafoLegal = `En el año ${matricula.vigencia.anio}, fue matriculado(a) en el grado ${textoGrado} de ${nivelAcademico} y al finalizar ${textoPeriodo} obtuvo los siguientes niveles de desempeño en las distintas áreas de estudio establecidas por la Ley 115 de 1994 y el Plan de Estudio consignado en el PEI de la Institución:`;

        // Textos automatizados (Fecha expedición)
        const fechaActual = new Date();
        const nombresMeses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        const ciudadFormateada = colegio.ciudad.charAt(0).toUpperCase() + colegio.ciudad.slice(1).toLowerCase();
        const textoExpedicion = `Para constancia se firma en ${ciudadFormateada} el ${fechaActual.getDate()} de ${nombresMeses[fechaActual.getMonth()]} de ${fechaActual.getFullYear()}.`;

        const logoBase64 = await _obtenerLogoBase64();

        // 7. ARMAR EL CONTEXTO FINAL PARA HANDLEBARS
        const contextoHbs = {
            urlEscudo: logoBase64,
            textoExpedicion,
            parrafoLegal,
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
            areas: areasFinales,
            comportamiento: notaComportamiento !== null ? {
                nota: notaComportamiento.toFixed(2).replace('.', ','),
                desempeno: desempeñoComportamiento
            } : null
        };

        // 8. Generar PDF (Creamos el enlace en pdfService luego)
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