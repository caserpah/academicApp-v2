import { boletinService } from "../services/boletin.service.js";
import { pdfService } from "../services/pdf.service.js";

export const boletinController = {

    /**
     * Endpoint: POST /api/boletines/generar-lote
     * Genera la estructura JSON y el PDF para todo el grupo.
     */
    async generarLote(req, res, next) {
        try {
            // 1. Extraemos el vigenciaId (del body o del middleware como fallback)
            const vigenciaId = req.body.vigenciaId ? Number(req.body.vigenciaId) : req.vigenciaActual.id;

            // 2. Extraemos el resto de parámetros validados
            const { grupoId, periodoActual, tipoBoletin, estudianteId } = req.body;
            const usuarioId = req.user.id; // Extraes el ID de quien hizo la petición

            // 3. Llamamos al servicio para que arme el Mega-Objeto JSON
            const dataBoletines = await boletinService.generarDatosBoletinLote(
                grupoId,
                vigenciaId,
                periodoActual,
                tipoBoletin,
                estudianteId,
                usuarioId
            );

            // Limpiamos los espacios y caracteres raros para crear un nombre de archivo seguro
            const nombreGrado = dataBoletines.grupo.grado.replace(/\s+/g, '_').toUpperCase();
            const nombreGrupo = dataBoletines.grupo.grupoNombre.replace(/\s+/g, '_').toUpperCase();

            // Creamos un nombre de archivo descriptivo para el PDF, por ejemplo: "Boletines_Grado_10_Grupo_A_P1.pdf"
            const nombreArchivo = `Boletines_${nombreGrado}_${nombreGrupo}_P${periodoActual}.pdf`;

            // =========================================================
            // FASE FINAL: Devolver PDF al cliente
            // =========================================================
            //4. Mandamos el JSON a la plantilla HTML y generamos el PDF
            const pdfBuffer = await pdfService.crearPdfBoletines(dataBoletines);

            // 5. Configuramos los headers para que el navegador sepa que es un archivo descargable
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

            // 6. Enviamos el buffer del PDF al cliente
            return res.send(pdfBuffer);

        } catch (error) {
            console.error("Error en boletinController.generarLote:", error);

            // Si el servicio lanzó el error de "No hay estudiantes", lo manejamos con 404
            if (error.message.includes("No hay estudiantes matriculados")) {
                error.status = 404;
            }
            next(error);
        }
    },

    // Función para auditar notas faltantes antes de imprimir boletines
    async auditarNotasPendientes(req, res, next) {
        try {
            const { grupoId, periodoActual, vigenciaId: queryVigencia } = req.query;

            if (!grupoId || !periodoActual) {
                return res.status(400).json({ status: 'error', message: "Selecciones el grupo y periodo académico." });
            }

            const vigenciaId = queryVigencia ? Number(queryVigencia) : req.vigenciaActual.id;
            const reporte = await boletinService.auditarNotasPendientes(grupoId, vigenciaId, periodoActual);

            return res.status(200).json({
                status: 'success',
                data: reporte
            });

        } catch (error) {
            console.error("Error en boletinController.auditarNotasPendientes:", error);
            next(error);
        }
    }
};