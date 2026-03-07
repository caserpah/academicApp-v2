import { nivelacionService } from "../services/nivelacion.service.js";
import { Docente } from "../models/docente.js";
import { Usuario } from "../models/usuario.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const nivelacionController = {

    /**
     * Obtener listado de estudiantes que reprobaron y necesitan nivelación
     * Query params esperados: ?grupoId=1&asignaturaId=5
     */
    async obtenerParaNivelar(req, res, next) {
        try {
            const { grupoId, asignaturaId } = req.query;

            if (!grupoId || !asignaturaId) {
                const error = new Error("Seleccione el grupo y asignatura.");
                error.status = 400;
                throw error;
            }

            const estudiantes = await nivelacionService.obtenerEstudiantesParaNivelar(grupoId, asignaturaId);

            return sendSuccess(res, estudiantes, "Lista de estudiantes para nivelación cargada exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Guardar la nota de nivelación y la evidencia adjunta
     * Params esperados en URL: /:matriculaId/:asignaturaId
     * Body esperado: formData (notaNivelacion, observacion_nivelacion, evidencia)
     */
    async registrar(req, res, next) {
        try {
            const { matriculaId, asignaturaId } = req.params;
            const usuarioId = req.user.id; // Asumiendo que viene del token de autenticación

            // 1. Manejo del archivo de evidencia (Si el middleware lo procesó)
            let fileUrl = null;
            if (req.file) {
                fileUrl = `uploads/evidencias/${req.file.filename}`;
            }

            // 2. Descubrir el docenteId a partir del usuarioId para auditoría
            let docenteId = null;
            const usuario = await Usuario.findByPk(usuarioId);

            if (usuario && usuario.documento) {
                const docente = await Docente.findOne({
                    where: { documento: usuario.documento }
                });
                if (docente) {
                    docenteId = docente.id;
                }
            }

            // 3. Enviar todo al servicio
            const resultado = await nivelacionService.registrarNivelacion(
                matriculaId,
                asignaturaId,
                req.body,
                fileUrl,
                docenteId
            );

            return sendSuccess(res, resultado, "Nivelación registrada exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Generar Consolidados Anuales (Cierre de Año Lectivo para un Grupo)
     * Endpoint: POST /api/nivelaciones/generar-consolidados
     * Body: { sedeId, gradoId, grupoId }
     */
    async generarConsolidados(req, res, next) {
        try {
            const { sedeId, gradoId, grupoId, vigenciaId, forzarCierre = false } = req.body;

            if (!vigenciaId) {
                return res.status(400).json({ message: "No se proporcionó la vigencia activa o año lectivo vigente." });
            }

            const resultado = await nivelacionService.generarConsolidadosAnuales({
                sedeId, gradoId, grupoId, vigenciaId, forzarCierre
            });

            // Si el status es warning, enviamos un 200 OK pero con la data del reporte
            if (resultado.status === 'warning') {
                return res.status(200).json({
                    status: 'warning',
                    message: resultado.mensaje,
                    data: resultado.faltantes
                });
            }

            return res.status(201).json({
                status: 'success',
                message: resultado.mensaje,
                data: { procesados: resultado.procesados }
            });
            // Si es success, enviamos 201 Created
            //return sendSuccess(res, resultado, resultado.mensaje, 201);
        } catch (error) {
            next(error);
        }
    }
};