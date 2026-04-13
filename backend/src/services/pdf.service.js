import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Configuración de rutas (Necesario en ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pdfService = {

    async crearPdfBoletines(dataBoletines) {
        let browser = null;
        try {
            // 1. Leer la plantilla HTML física
            const templatePath = path.join(__dirname, "../templates/boletines-lote.hbs");
            const htmlTemplate = await fs.readFile(templatePath, "utf-8");

            // 2. Compilar la plantilla con Handlebars e inyectar los datos
            const template = Handlebars.compile(htmlTemplate);
            const htmlFinal = template(dataBoletines);

            // 3. Iniciar Puppeteer (Modo Headless para mayor rendimiento)
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox'] // Recomendado para servidores Linux/VPS
            });

            const page = await browser.newPage();

            // 4. Cargar el HTML renderizado en la página
            await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

            // 5. Generar el PDF con formato A4
            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true, // Imprime colores de fondo y bordes de tablas
                scale: 1.15,           // Aumenta el tamaño un 11% (ajusta entre 1.1 y 1.15 según se necesite)
                preferCSSPageSize: true, // Obliga a usar el @page definido en la plantilla boletines-lote.hbs { margin: 10mm; }
                margin: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0
                },
            });

            return pdfBuffer;

        } catch (error) {
            console.error("Error al generar el PDF con Puppeteer:", error);
            throw new Error("Fallo la generación del documento PDF.");
        } finally {
            // MUY IMPORTANTE: Siempre cerrar el navegador para no saturar la RAM del servidor
            if (browser) {
                await browser.close();
            }
        }
    },

    async crearPdfMatriculas(dataMatriculas) {
        let browser = null;
        try {
            // 1. Leer la plantilla HTML de matrículas
            const templatePath = path.join(__dirname, "../templates/matriculas-lote.hbs");
            const htmlTemplate = await fs.readFile(templatePath, "utf-8");

            // 2. Compilar e inyectar datos
            const template = Handlebars.compile(htmlTemplate);
            const htmlFinal = template(dataMatriculas);

            // 3. Iniciar Puppeteer
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

            // 4. Generar el PDF (Usamos A4 o Legal según la necesidad)
            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true,
                preferCSSPageSize: true,
                margin: { top: 0, bottom: 0, left: 0, right: 0 },
            });

            return pdfBuffer;

        } catch (error) {
            console.error("Error al generar el PDF de matrículas:", error);
            throw new Error("Falló la generación del documento PDF de matrículas.");
        } finally {
            if (browser) await browser.close();
        }
    },

    async crearPdfPlanillasNuevas(dataPlanilla, tipoPlanilla) {
        let browser = null;
        try {
            // Determinar qué plantilla física usar según el parámetro
            const plantillasMap = {
                'ASISTENCIA': 'planilla-asistencia.hbs',
                'SEGUIMIENTO': 'planilla-seguimiento.hbs',
                'CALIFICACIONES': 'planilla-calificaciones.hbs',
                'COMPORTAMIENTO': 'planilla-comportamiento.hbs'
            };

            const nombreArchivoPlantilla = plantillasMap[tipoPlanilla];
            if (!nombreArchivoPlantilla) throw new Error("Tipo de plantilla no soportado.");

            const templatePath = path.join(__dirname, `../templates/${nombreArchivoPlantilla}`);
            const htmlTemplate = await fs.readFile(templatePath, "utf-8");

            // Compilar e inyectar datos
            const template = Handlebars.compile(htmlTemplate);
            const htmlFinal = template(dataPlanilla);

            // Iniciar Puppeteer
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

            // 4. Generar el PDF (Formato A4 Vertical)
            const pdfBuffer = await page.pdf({
                format: "A4",
                printBackground: true,
                preferCSSPageSize: true, // Usa el tamaño definido en la plantilla con @page { size: A4; margin: 10mm; }
                margin: {
                    top: '10mm',
                    bottom: '10mm',
                    left: '10mm',
                    right: '10mm'
                }
            });

            return pdfBuffer;

        } catch (error) {
            console.error(`Error al generar PDF de plantilla ${tipoPlanilla}:`, error);
            throw new Error(`Falló la generación del documento PDF para ${tipoPlanilla}.`);
        } finally {
            if (browser) await browser.close();
        }
    },

    async crearPdfSabanas(dataSabana, nombrePlantilla) {
        let browser = null;
        try {
            const templatePath = path.join(__dirname, `../templates/${nombrePlantilla}`);
            const htmlTemplate = await fs.readFile(templatePath, "utf-8");

            const template = Handlebars.compile(htmlTemplate);
            const htmlFinal = template(dataSabana);

            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setContent(htmlFinal, { waitUntil: "networkidle0" });

            const pdfBuffer = await page.pdf({
                format: "Legal", // Usamos tamaño Oficio/Legal para que quepan más columnas cómodamente
                landscape: true, // Orientación Horizontal
                printBackground: true,
                margin: {
                    top: '10mm',
                    bottom: '10mm',
                    left: '10mm',
                    right: '10mm'
                }
            });

            return pdfBuffer;

        } catch (error) {
            console.error(`Error al generar PDF de Sábana (${nombrePlantilla}):`, error);
            throw new Error("Falló la generación del documento PDF de la sábana.");
        } finally {
            if (browser) await browser.close();
        }
    }
};