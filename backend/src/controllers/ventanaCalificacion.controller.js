import { ventanaCalificacionService } from "../services/ventanaCalificacion.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const ventanaCalificacionController = {
    async list(req, res, next) {
        try {
            const data = await ventanaCalificacionService.list(req.query);
            return sendSuccess(res, data, "Listado de ventanas de calificaciones obtenido.");
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await ventanaCalificacionService.get(id);
            return sendSuccess(res, data, "Detalle de la ventana de calificaciones obtenido.");
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const data = await ventanaCalificacionService.create(req.body);
            return sendSuccess(res, data, "Ventana de calificaciones registrada con éxito.", 201);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await ventanaCalificacionService.update(id, req.body);
            return sendSuccess(res, data, "Ventana de calificaciones actualizada con éxito.");
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const id = Number(req.params.id);
            await ventanaCalificacionService.remove(id);
            return sendSuccess(res, null, "Ventana de calificaciones eliminada con éxito.");
        } catch (error) {
            next(error);
        }
    }
};