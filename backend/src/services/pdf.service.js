import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Configuración de rutas (Necesario en ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FUNCIÓN MAESTRA: Se encarga de levantar Puppeteer, inyectar Handlebars y generar el PDF.
 * Así evitamos repetir esta lógica en cada método.
 */
async function generarPdfBase(nombrePlantilla, data, opcionesPdfCustom = {}) {
    let browser = null;
    try {
        // 1. Leer la plantilla HTML física
        const templatePath = path.join(__dirname, `../templates/${nombrePlantilla}`);
        const htmlTemplate = await fs.readFile(templatePath, "utf-8");

        // 2. Compilar la plantilla con Handlebars e inyectar los datos
        const template = Handlebars.compile(htmlTemplate);
        const htmlFinal = template(data);

        // 3. Iniciar Puppeteer
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Recomendado para servidores Linux/VPS
        });

        const page = await browser.newPage();

        // 4. Cargar el HTML renderizado en la página
        await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

        // 5. Configuración por defecto (Se puede sobrescribir con opcionesPdfCustom)
        const opcionesPorDefecto = {
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: 0, bottom: 0, left: 0, right: 0 } // Al ser preferCSSPageSize: true, los márgenes DEBEN ser 0 aquí.
        };

        // 6. Generar el PDF combinando opciones por defecto y personalizadas
        const pdfBuffer = await page.pdf({ ...opcionesPorDefecto, ...opcionesPdfCustom });

        return pdfBuffer;

    } catch (error) {
        console.error(`Error al generar el PDF con la plantilla ${nombrePlantilla}:`, error);
        throw new Error(`Falló la generación del documento PDF para ${nombrePlantilla}.`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}


export const pdfService = {

    async crearPdfBoletines(dataBoletines) {
        // Usa la escala de 1.15 específica para boletines
        return await generarPdfBase("boletines-lote.hbs", dataBoletines, {
            scale: 1.15
        });
    },

    async crearPdfMatriculas(dataMatriculas) {
        return await generarPdfBase("matriculas-lote.hbs", dataMatriculas);
    },

    async crearPdfPlanillasNuevas(dataPlanilla, tipoPlanilla) {
        const plantillasMap = {
            'ASISTENCIA': 'planilla-asistencia.hbs',
            'SEGUIMIENTO': 'planilla-seguimiento.hbs',
            'CALIFICACIONES': 'planilla-calificaciones.hbs',
            'COMPORTAMIENTO': 'planilla-comportamiento.hbs'
        };

        const nombrePlantilla = plantillasMap[tipoPlanilla];
        if (!nombrePlantilla) throw new Error("Tipo de plantilla no soportado.");

        return await generarPdfBase(nombrePlantilla, dataPlanilla);
    },

    async crearPdfSabanas(dataSabana, nombrePlantilla) {
        // 1. Lógica de negocio: Determinar si cada acumulado es baja o no
        let periodoActual = parseInt(dataSabana.periodo);

        // Si el periodo viene undefined, lo deducimos dinámicamente del valor "n" del primer estudiante
        if (!periodoActual && dataSabana.estudiantes && dataSabana.estudiantes.length > 0) {
            const primerEstudiante = dataSabana.estudiantes[0];
            if (primerEstudiante.acumulados && primerEstudiante.acumulados.length > 0) {
                // Tomamos la cantidad de periodos sumados (ej. "n": 2)
                periodoActual = parseInt(primerEstudiante.acumulados[0].n);
            }
        }

        // Fallback de seguridad (por si todo falla, asume 1)
        periodoActual = periodoActual || 1;

        // Multiplicamos el periodo detectado, por ejemplo: (2) por 3.0 para obtener el mínimo (6.0)
        const minimoRequerido = periodoActual * 3.0;

        // Validamos que existan estudiantes antes de iterar
        if (dataSabana.estudiantes && Array.isArray(dataSabana.estudiantes)) {
            dataSabana.estudiantes.forEach(estudiante => {
                if (estudiante.acumulados && Array.isArray(estudiante.acumulados)) {
                    estudiante.acumulados.forEach(acumulado => {
                        // Reemplazamos coma por punto para asegurar la conversión matemática
                        const sumaNumerica = parseFloat(String(acumulado.suma).replace(',', '.'));

                        // Inyectamos la propiedad booleana 'esBaja'
                        acumulado.esBaja = !isNaN(sumaNumerica) && (sumaNumerica < minimoRequerido);
                    });
                }
            });
        }

        // 2. GENERACIÓN DEL ARCHIVO FISICO
        return await generarPdfBase(nombrePlantilla, dataSabana, {
            format: "Letter",
            landscape: true
        });
    },

    async crearPdfCertificado(dataCertificado, nombrePlantilla) {
        return await generarPdfBase(nombrePlantilla, dataCertificado, {
            format: "Letter"
        });
    },

    async crearPdfListado(dataListado, nombrePlantilla) {
        return await generarPdfBase(nombrePlantilla, dataListado);
    },

    async crearPdfActaNivelacion(dataActa) {
        return await generarPdfBase("acta-nivelacion.hbs", dataActa, {
            format: "Letter",
            margin: { top: 0, bottom: 0, left: 0, right: 0 }
        });
    }
};