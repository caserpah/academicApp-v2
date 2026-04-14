import { planillaService } from "../services/planilla.service.js";

export const planillaController = {
    async descargarPlanillaPdf(req, res, next) {
        try {
            const vigencia = req.vigenciaActual;
            const usuario = req.user;

            // Atrapamos todos los parámetros
            const { grupoId, tipoPlanilla, docenteId, periodo, modoMasivo } = req.query;

            let pdfBuffer;
            let nombreArchivo;

            // SOLUCIÓN: Forzamos a String para que funcione sin importar cómo llegue (booleano o texto)
            if (String(modoMasivo) === 'true') {
                if (!periodo) throw new Error("Seleccione el periodo para la generación masiva.");

                pdfBuffer = await planillaService.generarPlanillaMasivaDocente({
                    docenteId: docenteId ? parseInt(docenteId) : null,
                    tipoPlanilla: tipoPlanilla.toUpperCase(),
                    periodo: periodo,
                    usuario,
                    vigencia
                });

                nombreArchivo = `Planillas_${tipoPlanilla}_Masivas.pdf`;

            } else {
                // Generación Individual (la original)
                if (!grupoId || !tipoPlanilla) {
                    const error = new Error("Seleccione el Grupo y el tipo de Planilla.");
                    error.status = 400;
                    throw error;
                }

                pdfBuffer = await planillaService.generarPlanilla({
                    grupoId: parseInt(grupoId),
                    tipoPlanilla: tipoPlanilla.toUpperCase(),
                    usuario,
                    vigencia
                });

                nombreArchivo = `Planilla_${tipoPlanilla}_Grupo_${grupoId}.pdf`;
            }

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
            return res.send(pdfBuffer);

        } catch (error) {
            // Aseguramos de que el error tenga status para que el cliente lo procese bien
            if (!error.status) error.status = 400;
            next(error);
        }
    }
};