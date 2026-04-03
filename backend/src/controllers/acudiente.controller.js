import { acudienteService } from "../services/acudiente.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const acudienteController = {
    /**
     * Listar acudientes con filtros, paginación y búsqueda
     */
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
     * Eliminar acudiente
     */
    async delete(req, res, next) {
        try {
            const id = Number(req.params.id);
            await acudienteService.delete(id);
            return sendSuccess(res, null, "Acudiente eliminado exitosamente.");
        }
        catch (error) {
            next(error);
        }
    },

    // ============================================================
    // Lógica para asignar y desvincular acudientes de estudiantes
    // ============================================================

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
    },

    /**
     * Desvincular un acudiente de un estudiante
     */
    async desvincular(req, res, next) {
        try {
            const { estudianteId, acudienteId } = req.params;

            await acudienteService.desvincularAcudiente(estudianteId, acudienteId);

            return sendSuccess(res, null, "Acudiente desvinculado exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Habilitar acceso web para un acudiente
     */
    async habilitarAcceso(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await acudienteService.habilitarAccesoWeb(id);
            return sendSuccess(res, data, data.mensaje, 201);
        } catch (error) {
            next(error);
        }
    },
};