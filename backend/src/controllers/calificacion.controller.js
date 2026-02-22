import { calificacionService } from "../services/calificacion.service.js";
import { Docente } from "../models/docente.js";
import { Usuario } from "../models/usuario.js";
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
            const usuarioAuditoriaId = req.user.id; // ID del usuario del Token
            const usuarioRol = req.user.role;       // ROL del usuario (admin, coordinador, etc.)

            // Inyectamos la vigencia del middleware vigenciaContext al body
            const datosParaGuardar = {
                ...req.body,
                vigenciaId,
                usuarioAuditoriaId,
                role: usuarioRol
            };

            // --- ASIGNAR EL ARCHIVO A LA PROPIEDAD DE BD ---
            if (req.file) {
                // Guardamos la ruta relativa para que sea accesible luego
                // Ejemplo: uploads/evidencias/evidencia-123456.pdf
                datosParaGuardar.url_evidencia_cambio = `uploads/evidencias/${req.file.filename}`;
            }

            // LÓGICA DE AUDITORÍA: Resolver si el usuario es un Docente
            const usuario = await Usuario.findByPk(usuarioAuditoriaId);
            if (usuario && usuario.numeroDocumento) {
                const docente = await Docente.findOne({
                    where: { documento: usuario.numeroDocumento }
                });

                if (docente) {
                    datosParaGuardar.docenteId = docente.id;
                }
                // Si NO es docente (es Admin), no tocamos docenteId (se mantiene null o el anterior).
            }

            // Pasamos el body completo al servicio
            const data = await calificacionService.procesarGuardado(datosParaGuardar);

            return sendSuccess(
                res,
                data,
                "Calificación guardada exitosamente.",
                201 // Created / Updated
            );

        } catch (error) {
            // Si el servicio lanzó el error de justificación, lo interceptamos manualmante
            // para asegurarnos de enviar el campo 'code' al frontend.
            if (error.code === "REQ_JUSTIFICACION") {
                return res.status(400).json({
                    status: "error",
                    message: error.message,
                    code: "REQ_JUSTIFICACION"
                });
            }

            // Si es otro error, dejamos que el manejador global se encargue
            next(error);
        }
    }
};