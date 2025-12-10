import { desempenoRangoService } from "../services/desempenoRango.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const desempenoRangoController = {
    async list(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await desempenoRangoService.list(vigenciaId);

            return sendSuccess(
                res,
                data,
                "Listado de rangos de desempeño obtenido exitosamente."
            );
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const data = await desempenoRangoService.get(id, vigenciaId);

            return sendSuccess(
                res,
                data,
                "Información del rango de desempeño obtenida exitosamente."
            );
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await desempenoRangoService.create(req.body, vigenciaId);

            return sendSuccess(
                res,
                data,
                "El rango de desempeño fue registrado exitosamente.",
                201
            );
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const data = await desempenoRangoService.update(id, req.body, vigenciaId);

            return sendSuccess(
                res,
                data,
                "El rango de desempeño fue actualizado exitosamente."
            );
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            await desempenoRangoService.remove(id, vigenciaId);

            return sendSuccess(
                res,
                null,
                "El rango de desempeño fue eliminado exitosamente."
            );
        } catch (error) {
            next(error);
        }
    },
};