import { colegioService } from "../services/colegio.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

/**
 * Controlador: ColegioController
 * -------------------------------
 * Gestiona las operaciones CRUD sobre la entidad "Colegio".
 * Utiliza los middlewares de manejo de errores y respuestas estandarizadas.
 */
export const colegioController = {
    /**
     * Listar colegios
     * Permite filtros opcionales (nombre, ciudad, registroDane)
     */
    async list(req, res, next) {
        try {
            const data = await colegioService.list(req.query);
            return sendSuccess(res, data, "Listado de colegios obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtener un colegio por ID
     */
    async get(req, res, next) {
        try {
            const id = Number(req.params.id);
            const data = await colegioService.get(id);
            return sendSuccess(res, data, "Información del colegio obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Crear un nuevo colegio
     */
    async create(req, res, next) {
        try {
            const { message, data } = await colegioService.create(req.body);
            return sendSuccess(res, data, message, 201);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualizar un colegio
     */
    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { message, data } = await colegioService.update(id, req.body);
            return sendSuccess(res, data, message);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Eliminar un colegio
     */
    async remove(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { message } = await colegioService.remove(id);
            return sendSuccess(res, null, message);
        } catch (error) {
            next(error);
        }
    },
};