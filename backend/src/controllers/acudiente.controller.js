import { acudienteService } from "../services/acudiente.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const acudienteController = {
    async list(req, res, next) {
        try {
            const params = {
                page: req.query.page || 1,
                limit: req.query.limit || 20,
                busqueda: req.query.busqueda || req.query.search || ""
            };
            const data = await acudienteService.list(params);
            return sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtener un acudiente por ID
     */
    async get(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await acudienteService.get(id);
            return sendSuccess(res, data);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Crear acudiente
     */
    async create(req, res, next) {
        try {
            const data = await acudienteService.create(req.body);
            return sendSuccess(res, data, "Acudiente creado exitosamente.", 201);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualizar acudiente
     */
    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await acudienteService.update(id, req.body);
            return sendSuccess(res, data, "Acudiente actualizado exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Asignar un acudiente a un estudiante (Creándolo si es necesario)
     */
    async asignar(req, res, next) {
        try {
            // El body debe traer: { estudianteId, afinidad, documento, primerNombre... }
            const data = await acudienteService.asignarEstudiante(req.body);
            return sendSuccess(res, data, data.mensaje, 201);
        } catch (error) {
            next(error);
        }
    }
};