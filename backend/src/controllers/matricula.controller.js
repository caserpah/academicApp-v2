import { matriculaService } from "../services/matricula.service.js";
import { sendSuccess, sendError } from "../middleware/responseHandler.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { getVigenciaFromRequest } from "../utils/vigencia.helper.js";

export const matriculaController = {

    /**
     * GET /api/matriculas
     * Lista matrículas con paginación y filtros.
     */
    async listar(req, res) {

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
            return handleSequelizeError(res, error);
        }
    },

    /**
     * GET /api/matriculas/:id
     */
    async obtenerPorId(req, res) {
        try {
            const { id } = req.params;
            const matricula = await matriculaService.obtenerPorId(id);
            return sendSuccess(res, matricula);
        } catch (error) {
            return handleSequelizeError(res, error);
        }
    },

    /**
     * POST /api/matriculas
     * Crea una matrícula individual.
     */
    async crear(req, res) {
        try {
            const vigencia = getVigenciaFromRequest(req);
            const usuarioAuditorId = req.user?.id;

            const datos = {
                ...req.body,
                vigenciaId: vigencia.id, // Forzamos vigencia
                anioVigencia: vigencia.anio // Para el folio
            };

            const nuevaMatricula = await matriculaService.crear(datos, usuarioAuditorId);

            return sendSuccess(res, nuevaMatricula, "La matrícula fue registrada exitosamente", 201);

        } catch (error) {
            return handleSequelizeError(res, error);
        }
    },

    /**
     * PUT /api/matriculas/:id
     * Actualiza matrícula (estado, traslados, etc).
     */
    async actualizar(req, res) {
        try {
            const { id } = req.params;
            const usuarioAuditorId = req.user?.id;

            const matriculaActualizada = await matriculaService.actualizar(id, req.body, usuarioAuditorId);

            return sendSuccess(res, matriculaActualizada, "La matrícula fue actualizada exitosamente");

        } catch (error) {
            return handleSequelizeError(res, error);
        }
    },

    /**
     * POST /api/matriculas/masivo
     * Pre-matrícula o Promoción masiva.
     */
    async crearMasivo(req, res) {
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
            return handleSequelizeError(res, error);
        }
    }
};