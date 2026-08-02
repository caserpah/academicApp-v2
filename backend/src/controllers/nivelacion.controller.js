import { nivelacionService } from "../services/nivelacion.service.js";
import { Docente } from "../models/docente.js";
import { Usuario } from "../models/usuario.js";
import { Vigencia } from "../models/vigencia.js";
import { sendSuccess } from "../middleware/responseHandler.js";
import { nivelacionRepository } from "../repositories/nivelacion.repository.js";

export const nivelacionController = {

    /**
     * Obtener listado de estudiantes que reprobaron y necesitan nivelación
     * Query params esperados: ?grupoId=1&areaId=5
     */
    async obtenerParaNivelar(req, res, next) {
        try {
            const { grupoId, vigenciaId: vigenciaQueryId } = req.query;

            // Si el front envía un año histórico, lo usamos. Si no, usamos el año activo actual.
            const vigenciaId = vigenciaQueryId ? Number(vigenciaQueryId) : req.vigenciaActual?.id;

            if (!grupoId) {
                return res.status(400).json({ message: "Seleccione el grupo para cargar los estudiantes que necesitan nivelación." });
            }

            let docenteId = null;
            const usuarioId = req.user.id;

            // Lógica para detectar si es profesor y obtener su docenteId para filtrar solo sus estudiantes
            const rolUsuario = (req.user.role || req.user.rol || '').toUpperCase();

            if (rolUsuario === 'DOCENTE') {
                const docente = await Docente.findOne({ where: { usuarioId: usuarioId } });
                if (docente) {
                    docenteId = docente.id;
                }
            }

            // El servicio usará el vigenciaId (histórico o actual) de forma transpa
            const areasAgrupadas = await nivelacionService.obtenerEstudiantesParaNivelar(grupoId, docenteId, vigenciaId);

            return sendSuccess(res, areasAgrupadas, "Lista de nivelaciones cargada exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Guardar la nota de nivelación y la evidencia adjunta
     * Params esperados en URL: /:matriculaId/:areaId
     * Body esperado: formData (notaNivelacion, observacion_nivelacion, evidencia)
     */
    async registrar(req, res, next) {
        try {
            const { matriculaId, areaId } = req.params;
            const usuarioAuditorId = req.user.id;

            // 1. Manejo del archivo de evidencia (Si el middleware lo procesó)
            let fileUrl = null;
            if (req.file) {
                fileUrl = `/uploads/evidencias/${req.file.filename}`;
            }

            // 2. Enviar todo al servicio
            const resultado = await nivelacionService.registrarNivelacion(
                matriculaId,
                areaId,
                req.body,
                fileUrl,
                usuarioAuditorId
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
            const { sedeId, gradoId, grupoId, vigenciaId: bodyVigenciaId, forzarCierre = false, estudiantesExcluidos } = req.body;
            const vigenciaId = bodyVigenciaId ? Number(bodyVigenciaId) : req.vigenciaActual?.id;

            if (!vigenciaId) {
                return res.status(400).json({ message: "No se detectó un año lectivo activo en el contexto." });
            }

            if (!sedeId || !gradoId || !grupoId) {
                return res.status(400).json({ message: "Selecciona la sede, el grado y el grupo para generar los consolidados." });
            }

            const resultado = await nivelacionService.generarConsolidadosAnuales({
                sedeId,
                gradoId,
                grupoId,
                vigenciaId,
                forzarCierre,
                estudiantesExcluidos: estudiantesExcluidos || []
            });

            // Si el status es warning, enviamos un 200 OK pero con la data del reporte
            if (resultado.status === 'warning') {
                return res.status(200).json({
                    status: 'warning',
                    message: resultado.mensaje,
                    data: resultado.faltantes
                });
            }

            // Si es info (ej: sin estudiantes o sin carga), devolvemos 200 con status info
            if (resultado.status === 'info') {
                return res.status(200).json({
                    status: 'info',
                    message: resultado.mensaje
                });
            }

            return res.status(201).json({
                status: 'success',
                message: resultado.mensaje,
                data: { procesados: resultado.procesados }
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Verificar si ya existen consolidados generados para un grupo específico en la vigencia actual
     * Endpoint: GET /api/nivelaciones/verificar-consolidados?grupoId=1
     */
    async verificarConsolidados(req, res, next) {
        try {
            const { grupoId, vigenciaId: queryVigenciaId } = req.query;
            const vigenciaId = queryVigenciaId ? Number(queryVigenciaId) : req.vigenciaActual?.id;

            if (!grupoId || !vigenciaId) {
                return res.json({ consolidadosGenerados: false });
            }

            // Preguntamos a la tabla grupo si el grupo seleccionado ya tiene el cierre
            const existe = await nivelacionRepository.verificarCierreGrupo(grupoId);

            return res.json({ consolidadosGenerados: existe });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtener estudiantes que reprueban el año directamente (3 o más áreas perdidas)
     * Endpoint: GET /api/nivelaciones/reprobados-directos?grupoId=1
     */
    async obtenerReprobadosDirectos(req, res, next) {
        try {
            const { grupoId, vigenciaId: vigenciaQueryId } = req.query;

            // Usamos la vigencia si viene en la URL, o la actual por defecto
            const vigenciaId = vigenciaQueryId ? Number(vigenciaQueryId) : req.vigenciaActual?.id;

            if (!grupoId || !vigenciaId) {
                return res.status(400).json({
                    message: "Selecciona el grupo y el año lectivo."
                });
            }

            // Llamamos a la lógica de negocio en el servicio
            const reprobados = await nivelacionService.obtenerReprobadosDirectos(grupoId, vigenciaId);

            // Respondemos con la estructura que espera el frontend (response.data.data)
            return res.status(200).json({
                status: 'success',
                data: reprobados
            });
        } catch (error) {
            next(error);
        }
    },

    /**
     * Guardar de manera masiva las notas faltantes detectadas en la auditoría de cierre de año
     * Endpoint: POST /api/nivelaciones/completar-notas-faltantes
     */
    async completarNotasFaltantes(req, res, next) {
        try {
            const { notas } = req.body;
            const vigenciaId = req.vigenciaActual?.id;

            if (!notas || !Array.isArray(notas) || notas.length === 0) {
                return res.status(400).json({ message: "No se recibieron calificaciones para registrar." });
            }

            if (!vigenciaId) {
                return res.status(400).json({ message: "No se detectó un año lectivo activo en el contexto." });
            }

            // Delegamos la inserción masiva a la capa de servicios
            await nivelacionService.guardarCalificacionesPendientes(notas, vigenciaId);

            return res.status(200).json({
                status: 'success',
                message: "Calificaciones registradas correctamente. Para finalizar el proceso, presione el botón Generar Consolidados"
            });
        } catch (error) {
            next(error);
        }
    },

    async descargarActaPdf(req, res, next) {
        try {
            const { grupoId, areaId, vigenciaId } = req.query;
            let vigenciaTarget = req.vigenciaActual; // Por defecto, usamos el objeto del contexto

            if (!grupoId || !areaId) {
                return res.status(400).json({ message: "Seleccione un grupo y área." });
            }

            // Si el frontend envía una vigencia diferente a la actual, buscamos el objeto histórico
            if (vigenciaId && Number(vigenciaId) !== req.vigenciaActual?.id) {
                const vigenciaHistorica = await Vigencia.findByPk(vigenciaId);

                if (!vigenciaHistorica) {
                    return res.status(404).json({ message: "El año lectivo seleccionado no existe." });
                }

                vigenciaTarget = vigenciaHistorica;
            }

            const pdfBuffer = await nivelacionService.generarActaNivelacionPdf(grupoId, areaId, vigenciaTarget);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename=acta_nivelacion.pdf`);
            return res.send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    }
};