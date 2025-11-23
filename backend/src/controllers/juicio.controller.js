import { juicioService } from "../services/juicio.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const juicioController = {

    async list(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const { items, pagination } = await juicioService.list(req.query, vigenciaId);

            return sendSuccess(
                res,
                { items, pagination },
                "Listado de juicios obtenido exitosamente."
            );
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const data = await juicioService.get(id, vigenciaId);

            return sendSuccess(res,data,"Información del juicio obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await juicioService.create(req.body, vigenciaId);

            return sendSuccess(res,data,"El juicio fue registrado exitosamente.",201);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const data = await juicioService.update(id, req.body, vigenciaId);

            return sendSuccess(res,data,"El juicio fue actualizado exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            await juicioService.remove(id, vigenciaId);

            return sendSuccess(res,null,"El juicio fue eliminado exitosamente.");
        } catch (error) {
            next(error);
        }
    },
};