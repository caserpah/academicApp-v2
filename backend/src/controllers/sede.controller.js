import { sedeService } from "../services/sede.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const sedeController = {
    async list(req, res, next) {
        try {
            const data = await sedeService.list(req.query);
            return sendSuccess(res, data, "Listado de sedes obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await sedeService.get(id);
            return sendSuccess(res, data, "Información de la sede obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const { message, data } = await sedeService.create(req.body);
            return sendSuccess(res, data, message, 201);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { message, data } = await sedeService.update(id, req.body);
            return sendSuccess(res, data, message);
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { message } = await sedeService.remove(id);
            return sendSuccess(res, null, message);
        } catch (error) {
            next(error);
        }
    },
};