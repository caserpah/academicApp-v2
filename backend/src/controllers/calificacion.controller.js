import { calificacionService } from "../services/calificacion.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const calificacionController = {

    /**
     * Obtener calificaciones de un grupo (Grilla)
     * Regla #2 y #4: Listar estudiantes habilitados y bloqueados al final.
     */
    async getPorGrupo(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const { grupoId, asignaturaId, periodo } = req.query;

            if (!grupoId || !asignaturaId || !periodo) {
                const error = new Error("Faltan parámetros requeridos. (Grupo, asignatura, periodo, año lectivo)");
                error.status = 400;
                throw error;
            }

            const grilla = await calificacionService.obtenerGrilla(grupoId, asignaturaId, periodo, vigenciaId);

            return sendSuccess(
                res,
                grilla,
                "Grilla de calificaciones cargada exitosamente."
            );

        } catch (error) {
            console.error("Error en getPorGrupo:", error);
            next(error);
        }
    },

    /**
     * Guardar o Actualizar calificación
     */
    async guardar(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;

            // Inyectamos la vigencia del middleware vigenciaContext al body
            const datosParaGuardar = {
                ...req.body,
                vigenciaId
            };

            // Pasamos el body completo al servicio
            const data = await calificacionService.procesarGuardado(datosParaGuardar);

            return sendSuccess(
                res,
                data,
                "Calificación guardada exitosamente.",
                201 // Created / Updated
            );

        } catch (error) {
            next(error);
        }
    }
};