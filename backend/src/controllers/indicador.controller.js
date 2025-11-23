import { indicadorService } from "../services/indicador.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const indicadorController = {

    async list(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await indicadorService.list(req.query, vigenciaId);

            return sendSuccess(res, data, "Listado de indicadores obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async get(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const data = await indicadorService.get(id, vigenciaId);

            return sendSuccess(res, data, "Información del indicador obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async create(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const data = await indicadorService.create(req.body, vigenciaId);

            return sendSuccess(res, data, "El indicador fue registrado exitosamente.", 201);
        } catch (error) {
            next(error);
        }
    },

    async update(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            const data = await indicadorService.update(id, req.body, vigenciaId);

            return sendSuccess(res, data, "El indicador fue actualizado exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const id = Number(req.params.id);
            await indicadorService.remove(id, vigenciaId);
            return sendSuccess(res, null, "El indicador fue eliminado exitosamente.");
        } catch (error) {
            next(error);
        }
    }
};