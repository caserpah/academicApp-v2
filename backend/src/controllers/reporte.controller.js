import { reporteService } from "../services/reporte.service.js";

export const reporteController = {

    async descargarSabana(req, res, next) {
        try {
            const usuario = req.user;
            const { grupoId, tipoSabana, asignaturaId, periodo, vigenciaId: queryVigenciaId, formato = 'pdf', grupoNombre } = req.query;

            const vigenciaId = queryVigenciaId ? Number(queryVigenciaId) : req.vigenciaActual.id;

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

            if (tipoSabana === 'SABANA_AREAS' && !periodo) {
                const error = new Error("Debe seleccionar obligatoriamente un periodo para generar este reporte.");
                error.status = 400;
                throw error;
            }

            const params = {
                grupoId: parseInt(grupoId),
                tipoSabana: tipoSabana.toUpperCase(),
                asignaturaId: asignaturaId ? parseInt(asignaturaId) : null,
                periodo: periodo ? parseInt(periodo) : null,
                usuario,
                vigenciaId,
                grupoNombre
            };

            let bufferArchivo, nombreArchivo, contentType;
            const identificadorGrupo = grupoNombre || grupoId; // Construimos el mismo nombre: ej. SABANA_AREAS_6A.xlsx

            if (formato === 'excel') {
                bufferArchivo = await reporteService.generarSabanaExcel(params);
                nombreArchivo = `${tipoSabana}_${identificadorGrupo}.xlsx`;
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            } else {
                bufferArchivo = await reporteService.generarSabanaPdf(params);
                nombreArchivo = `${tipoSabana}_${identificadorGrupo}.pdf`;
                contentType = "application/pdf";
            }

            res.setHeader("Content-Type", contentType);
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
            return res.send(bufferArchivo);

        } catch (error) {
            console.error("Error en descargarSabana:", error);
            next(error);
        }
    }
};