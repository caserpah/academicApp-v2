import { coordinadorService } from "../services/coordinador.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const coordinadorController = {
    async list(req, res, next) {
        try {
            const data = await coordinadorService.list(req.query);
            return sendSuccess(res, data, "Listado de coordinadores obtenido exitosamente.");
        } catch (error) { next(error); }
    },

    async get(req, res, next) {
        try {
            const data = await coordinadorService.get(Number(req.params.id));
            return sendSuccess(res, data, "Información del coordinador obtenida exitosamente.");
        } catch (error) { next(error); }
    },

    async create(req, res, next) {
        try {
            const { message, data } = await coordinadorService.create(req.body);
            return sendSuccess(res, data, message, 201);
        } catch (error) { next(error); }
    },

    async update(req, res, next) {
        try {
            const { message, data } = await coordinadorService.update(Number(req.params.id), req.body);
            return sendSuccess(res, data, message);
        } catch (error) { next(error); }
    },

    async remove(req, res, next) {
        try {
            const { message } = await coordinadorService.remove(Number(req.params.id));
            return sendSuccess(res, null, message);
        } catch (error) { next(error); }
    }
};