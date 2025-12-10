import { grupoService } from "../services/grupo.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const grupoController = {

    /** Listar grupos */
    async list(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;

            const data = await grupoService.list(req.query, vigenciaId);

            return sendSuccess(res, data, "Listado de grupos obtenido exitosamente." );
        } catch (error) {
            next(error);
        }
    },

    /** Obtener un grupo por ID */
    async get(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);

            const data = await grupoService.get(id, vigenciaId);

            return sendSuccess(res, data, "Información del grupo obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /** Crear grupo */
    async create(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;

            const data = await grupoService.create(req.body, vigenciaId);

            return sendSuccess(
                res,
                data,
                "El grupo fue registrado exitosamente.",
                201
            );
        } catch (error) {
            next(error);
        }
    },

    /** Actualizar grupo */
    async update(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);

            const data = await grupoService.update(id, req.body, vigenciaId);

            return sendSuccess(res, data, "El grupo fue actualizado exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /** Eliminar grupo */
    async remove(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);

            await grupoService.remove(id, vigenciaId);

            return sendSuccess(res, null, "El grupo fue eliminado exitosamente.");
        } catch (error) {
            next(error);
        }
    },
};