import { matriculaService } from "../services/matricula.service.js";
import { Matricula } from "../models/matricula.js";
import { sendSuccess, sendError } from "../middleware/responseHandler.js";
import { getVigenciaFromRequest } from "../utils/vigencia.helper.js";
import { Vigencia } from "../models/vigencia.js";
import { Op } from "sequelize";

export const matriculaController = {

    /**
     * GET /api/matriculas
     * Lista matrículas con paginación y filtros.
     */
    async listar(req, res, next) {

        try {
            // Obtener contexto de vigencia
            const vigencia = getVigenciaFromRequest(req);

            // Construir filtros desde query params
            const filtros = {
                page: req.query.page,
                limit: req.query.limit,
                vigenciaId: vigencia.id, // Forzamos la vigencia del contexto
                sedeId: req.query.sedeId,
                grupoId: req.query.grupoId,
                gradoId: req.query.gradoId,
                estado: req.query.estado,
                busqueda: req.query.busqueda,
                orderBy: req.query.orderBy,
                order: req.query.order
            };

            // Llamar al servicio
            const resultado = await matriculaService.listar(filtros);

            return sendSuccess(res, resultado);

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/matriculas/:id
     */
    async obtenerPorId(req, res, next) {
        try {
            const { id } = req.params;
            const matricula = await matriculaService.obtenerPorId(id);
            return sendSuccess(res, matricula);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/matriculas
     * Crea una matrícula individual.
     */
    async crear(req, res, next) {
        try {
            const usuarioAuditorId = req.user?.id;

            // Obtenemos la vigencia "por defecto" (la actual del sistema)
            const vigenciaDefault = getVigenciaFromRequest(req);

            let vigenciaFinal = vigenciaDefault;
            let anioFinal = vigenciaDefault.anio;

            // Si el usuario envió una vigenciaId distinta en el formulario...
            if (req.body.vigenciaId && req.body.vigenciaId != vigenciaDefault.id) {
                // ...buscamos esa vigencia en la BD para asegurarnos que existe y obtener su año (para el folio)
                const vigenciaSeleccionada = await Vigencia.findByPk(req.body.vigenciaId);

                if (!vigenciaSeleccionada) {
                    return sendError(res, "El año lectivo seleccionado no es válido.", 400);
                }
                vigenciaFinal = vigenciaSeleccionada;
                anioFinal = vigenciaSeleccionada.anio; // Necesario para generar el folio (MAT-202X-...)
            }

            const datos = {
                ...req.body,
                vigenciaId: vigenciaFinal.id, // Usamos la vigencia final seleccionada por el usuario
                anioVigencia: anioFinal // Usamos el año de la vigencia final para el folio
            };

            const nuevaMatricula = await matriculaService.crear(datos, usuarioAuditorId);
            return sendSuccess(res, nuevaMatricula, "La matrícula fue registrada exitosamente", 201);

        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /api/matriculas/:id
     * Actualiza matrícula (estado, traslados, etc).
     */
    async actualizar(req, res, next) {
        try {
            const { id } = req.params;
            const usuarioAuditorId = req.user?.id;
            const datosActualizar = { ...req.body };

            // --- VALIDACIÓN DE CAMBIO DE AÑO LECTIVO ---
            if (datosActualizar.vigenciaId) {
                // Verificar que el año destino existe
                const vigenciaDestino = await Vigencia.findByPk(datosActualizar.vigenciaId);
                if (!vigenciaDestino) {
                    return sendError(res, "El año lectivo seleccionado no existe.", 400);
                }

                // Obtener el ID del estudiante para verificar duplicados
                // Si viene en el body lo usamos, si no, buscamos la matrícula actual
                let idEstudiante = datosActualizar.estudianteId;

                if (!idEstudiante) {
                    const matriculaActual = await Matricula.findByPk(id, { attributes: ['estudianteId'] });
                    if (!matriculaActual) return sendError(res, "La matrícula a editar no existe.", 404);
                    idEstudiante = matriculaActual.estudianteId;
                }

                // Verificar que el estudiante no tenga otra matrícula en el año destino (excepto la actual)
                const existe = await Matricula.findOne({
                    where: {
                        estudianteId: idEstudiante,
                        vigenciaId: datosActualizar.vigenciaId,
                        id: { [Op.ne]: id }
                    }
                });
                if (existe) {
                    throw new Error("El estudiante ya tiene otra matrícula registrada en el año lectivo seleccionado.");
                }
            }

            const matriculaActualizada = await matriculaService.actualizar(id, datosActualizar, usuarioAuditorId);

            return sendSuccess(res, matriculaActualizada, "La matrícula fue actualizada exitosamente");

        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/matriculas/:id
     * Elimina una matrícula (si es posible).
     */
    async eliminar(req, res, next) {
        try {
            const { id } = req.params;

            const eliminada = await matriculaService.eliminar(id);
            return sendSuccess(res, eliminada, "La matrícula fue eliminada exitosamente");
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/matriculas/masivo
     * Pre-matrícula o Promoción masiva.
     */
    async crearMasivo(req, res, next) {
        try {
            const vigencia = getVigenciaFromRequest(req);
            const usuarioId = req.user?.id;

            const { estudiantesIds, grupoDestinoId, sedeId } = req.body;

            // Validaciones básicas de entrada
            if (!Array.isArray(estudiantesIds) || estudiantesIds.length === 0) {
                return sendError(res, "Debe enviar una lista de estudiantes válida.", 400);
            }
            if (!grupoDestinoId || !sedeId) {
                return sendError(res, "El grupo de destino y la sede son obligatorios.", 400);
            }

            const resultado = await matriculaService.prematricularMasivo({
                estudiantesIds,
                grupoDestinoId,
                sedeId,
                vigenciaId: vigencia.id,
                anioVigencia: vigencia.anio,
                usuarioId
            });

            return sendSuccess(res, resultado, resultado.mensaje, 201);

        } catch (error) {
            next(error);
        }
    }
};