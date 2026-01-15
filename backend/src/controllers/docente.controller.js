import { docenteService } from "../services/docente.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const docenteController = {

    /**
     * GET /docentes
     * Listar con paginación y ordenamiento
     */
    async list(req, res, next) {
        try {
            const data = await docenteService.list(req.query);

            return sendSuccess(res, data, "Listado de docentes obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /docentes/:id
     * Obtener un docente por ID
     */
    async get(req, res, next) {
        try {
            const id = Number(req.params.id);

            const data = await docenteService.get(id);

            return sendSuccess(res, data, "Información del docente obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /docentes
     * Crear docente
     */
    async create(req, res, next) {
        try {
            const data = await docenteService.create(req.body);

            return sendSuccess(
                res,
                data,
                "El docente fue registrado exitosamente.",
                201
            );

        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /docentes/:id
     * Actualizar docente
     */
    async update(req, res, next) {
        try {
            const id = Number(req.params.id);

            const data = await docenteService.update(id, req.body);

            return sendSuccess(
                res,
                data,
                "El docente fue actualizado exitosamente."
            );
        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /docentes/:id
     * Eliminar docente
     */
    async remove(req, res, next) {
        try {
            const id = Number(req.params.id);

            await docenteService.remove(id);

            return sendSuccess(
                res,
                null,
                "El docente fue eliminado exitosamente."
            );
        } catch (error) {
            next(error);
        }
    },
};