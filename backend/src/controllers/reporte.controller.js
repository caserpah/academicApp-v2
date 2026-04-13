import { reporteService } from "../services/reporte.service.js";

export const reporteController = {

    async descargarSabanaPdf(req, res, next) {
        try {
            const vigencia = req.vigenciaActual;
            const usuario = req.user;
            const { grupoId, tipoSabana, asignaturaId, periodo } = req.query;

            if (!grupoId || !tipoSabana) {
                const error = new Error("Faltan parámetros requeridos (grupoId, tipoSabana).");
                error.status = 400;
                throw error;
            }

            // Para la sábana de asignatura, validamos que venga el ID
            if (tipoSabana === 'SABANA_ASIGNATURA' && !asignaturaId) {
                const error = new Error("Debe seleccionar una asignatura para generar este reporte.");
                error.status = 400;
                throw error;
            }

            const pdfBuffer = await reporteService.generarSabanaPdf({
                grupoId: parseInt(grupoId),
                tipoSabana: tipoSabana.toUpperCase(),
                asignaturaId: asignaturaId ? parseInt(asignaturaId) : null,
                periodo: periodo ? parseInt(periodo) : null,
                usuario,
                vigencia
            });

            const nombreArchivo = `Sabana_${tipoSabana}_Grupo_${grupoId}.pdf`;

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);

            return res.send(pdfBuffer);

        } catch (error) {
            console.error("Error en descargarSabanaPdf:", error);
            next(error);
        }
    }
};