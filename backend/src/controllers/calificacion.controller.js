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

            return sendSuccess(res, grilla, "Grilla de calificaciones cargada exitosamente.");

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
            const usuarioId = req.user.id; // ID del usuario del Token
            const usuarioRol = req.user.role;       // ROL del usuario (admin, coordinador, etc.)

            // Inyectamos la vigencia del middleware vigenciaContext al body
            const datosParaGuardar = {
                ...req.body,
                vigenciaId,
                usuarioId: usuarioId,
                role: usuarioRol
            };

            // --- ASIGNAR EL ARCHIVO A LA PROPIEDAD DE BD ---
            if (req.file) {
                // Guardamos la ruta relativa para que sea accesible luego
                // Ejemplo: uploads/evidencias/evidencia-123456.pdf
                datosParaGuardar.url_evidencia_cambio = `uploads/evidencias/${req.file.filename}`;
            }

            // LÓGICA DE AUDITORÍA: Resolver si el usuario es un Docente
            const usuario = await Usuario.findByPk(usuarioId);
            if (usuario && usuario.documento) {
                const docente = await Docente.findOne({
                    where: { documento: usuario.documento }
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
    },

    // ========== Funciones para Importación Masiva ==========

    async descargarPlantilla(req, res, next) {
        try {
            const { periodo } = req.query;
            const vigenciaId = req.vigenciaActual.id;

            // Buscar datos completos del usuario (si el token no tiene el documento)
            const usuario = await Usuario.findByPk(req.user.id);
            if (!usuario) throw new Error("Usuario no encontrado.");

            // Buscar Docente usando el documento del usuario
            const docente = await Docente.findOne({
                where: { documento: usuario.documento }
            });

            if (!docente) {
                return res.status(403).json({
                    message: "El usuario actual no tiene un perfil de docente asociado (No coincide documento)."
                });
            }

            if (!periodo) return res.status(400).json({ message: "Falta el periodo." });

            const buffer = await calificacionService.generarPlantillaDocente(docente.id, periodo, vigenciaId);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Planilla_Notas_Periodo_${periodo}.xlsx`);
            res.send(buffer);

        } catch (error) {
            next(error);
        }
    },

    async importar(req, res, next) {
        try {
            if (!req.file) throw new Error("No se ha subido ningún archivo.");

            const usuario = await Usuario.findByPk(req.user.id);
            if (!usuario) throw new Error("Usuario no encontrado.");

            const docente = await Docente.findOne({
                where: { documento: usuario.documento }
            });

            if (!docente) throw new Error("No se encontró perfil docente para este usuario.");

            const resultado = await calificacionService.importarArchivoDocente(
                req.file.buffer,    // 1. Buffer
                docente.id,         // 2. Docente ID
                req.user.id,        // 3. Usuario ID (Auditoría)
                req.user.role       // 4. Rol (Necesario para validar Ventana)
            );

            // Respuesta matizada
            if (!resultado.exito || resultado.reporte.errores.length > 0) {
                return res.status(200).json({
                    status: 'warning',
                    message: `Proceso finalizado con observaciones.`,
                    data: resultado.reporte // Frontend mostrará la lista de errores
                });
            }

            return sendSuccess(res, resultado.reporte, "Importación completada exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Funciones para Reporte de estudiante con notas pendiente
     */
    async checkPendientes(req, res, next) {
        try {
            const { grupoId, asignaturaId, periodo } = req.query;
            const vigenciaId = req.vigenciaActual.id;

            if (!grupoId || !asignaturaId || !periodo) {
                return res.status(400).json({ message: "Faltan parámetros." });
            }

            const resultado = await calificacionService.auditarNotasPendientesAnteriores(
                parseInt(grupoId),
                parseInt(asignaturaId),
                parseInt(periodo),
                vigenciaId
            );
            return sendSuccess(res, resultado, "Auditoría completada");

        } catch (error) {
            next(error);
        }
    },

    /*
    // Descarga del reporte
    async descargarReportePendientes(req, res, next) {
        try {
            if (req.user.role !== 'docente') throw new Error("Acceso denegado.");

            const userId = req.user.id;
            const { vigenciaId } = req.query;

            // Misma lógica de puente: Usuario -> Documento -> Docente
            const usuario = await Usuario.findByPk(userId);
            if (!usuario) throw new Error("Usuario no válido.");

            const docente = await Docente.findOne({ where: { documento: usuario.documento } });
            if (!docente) throw new Error("Perfil de docente no encontrado.");

            const buffer = await calificacionService.generarReportePendientes(docente.id, vigenciaId);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Pendientes_Academicos.xlsx');
            res.send(buffer);
        } catch (error) {
            next(error);
        }
    }
    */
};