import { asignaturaService } from "../services/asignatura.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const asignaturaController = {
    async list(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await asignaturaService.list(req.query, vigenciaId);
            return sendSuccess(res, data, "Listado de asignaturas obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const data = await asignaturaService.get(id, vigenciaId);
            return sendSuccess(res, data, "Información de la asignatura obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await asignaturaService.create(req.body, vigenciaId);
            return sendSuccess(res, data, "La asignatura fue registrada exitosamente.", 201);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const data = await asignaturaService.update(id, req.body, vigenciaId);
            return sendSuccess(res, data, "La asignatura fue actualizada exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            await asignaturaService.remove(id, vigenciaId);
            return sendSuccess(res, null, "La asignatura fue eliminada exitosamente.");
        } catch (error) {
            next(error);
        }
    }
};