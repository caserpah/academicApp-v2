import { areaService } from "../services/area.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const areaController = {
    async list(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await areaService.list(req.query, vigenciaId);
            return sendSuccess(res, data, "Listado de áreas obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const area = await areaService.get(id, vigenciaId);
            return sendSuccess(res, area, "Información del área obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const area = await areaService.create(req.body, vigenciaId);
            return sendSuccess(res, area, "El área fue registrada exitosamente.", 201);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const area = await areaService.update(id, req.body, vigenciaId);
            return sendSuccess(res, area, "El área fue actualizada exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            await areaService.remove(id, vigenciaId);
            return sendSuccess(res, null, "El área fue eliminada exitosamente.");
        } catch (error) {
            next(error);
        }
    }
};