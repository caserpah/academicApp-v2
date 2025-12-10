import { cargaService } from "../services/carga.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const cargaController = {

    async list(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await cargaService.list(req.query, vigenciaId);
            return sendSuccess(res, data, "Listado de cargas académicas obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const data = await cargaService.get(id, vigenciaId);

            return sendSuccess(res, data, "Información de la carga académica obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await cargaService.create(req.body, vigenciaId);

            return sendSuccess(
                res,
                data,
                "La carga académica fue registrada exitosamente.",
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
            const data = await cargaService.update(id, req.body, vigenciaId);

            return sendSuccess(res, data, "La carga académica fue actualizada exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            await cargaService.remove(id, vigenciaId);

            return sendSuccess(res, null, "La carga académica fue eliminada exitosamente.");

        } catch (error) {
            next(error);
        }
    }
};