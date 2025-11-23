import { coordinadorSedesService } from "../services/coordinadorSedes.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const coordinadorSedesController = {
    async list(req, res, next) {
        try {
            const data = await coordinadorSedesService.list(req.query, req);
            return sendSuccess(res, data, "Listado de coordinadores por sede obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await coordinadorSedesService.get(id);
            return sendSuccess(res, data, "Información de la asignación obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const { message, data } = await coordinadorSedesService.create(req.body, req);
            return sendSuccess(res, data, message, 201);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { message, data } = await coordinadorSedesService.update(id, req.body);
            return sendSuccess(res, data, message);
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { message } = await coordinadorSedesService.remove(id);
            return sendSuccess(res, null, message);
        } catch (error) {
            next(error);
        }
    },
};