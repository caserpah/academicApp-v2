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
    }
};