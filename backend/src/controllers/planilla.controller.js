import { planillaService } from "../services/planilla.service.js";

export const planillaController = {

    async descargarPlanillaPdf(req, res, next) {
        try {
            const vigencia = req.vigenciaActual;
            const usuario = req.user;
            const { grupoId, tipoPlanilla } = req.query;

            if (!grupoId || !tipoPlanilla) {
                const error = new Error("Seleccione el Grupo y el tipo de Planilla.");
                error.status = 400;
                throw error;
            }

            // Llamamos al servicio pasando el contexto completo
            const pdfBuffer = await planillaService.generarPlanilla({
                grupoId: parseInt(grupoId),
                tipoPlanilla: tipoPlanilla.toUpperCase(),
                usuario,
                vigencia
            });

            // Configuramos los headers para la descarga del PDF
            const nombreArchivo = `Planilla_${tipoPlanilla}_Grupo_${grupoId}.pdf`;

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);

            // Enviamos el buffer binario
            return res.send(pdfBuffer);

        } catch (error) {
            console.error("Error en descargarPlanillaPdf:", error);
            // Pasamos el error al manejador global de tu app
            next(error);
        }
    }
};