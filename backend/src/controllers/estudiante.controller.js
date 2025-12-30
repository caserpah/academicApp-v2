import { estudianteService } from "../services/estudiante.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const estudianteController = {

    /**
     * GET /estudiantes
     * Listado con filtros, paginación y búsqueda.
     */
    async list(req, res, next) {
        try {
            const params = {
                ...req.query,
                busqueda: req.query.busqueda || req.query.search || "", // Forzamos la captura
            };

            // si se desea incluir matrículas, debemos pasar la vigencia
            if (req.query.includeMatriculas === "true" && req.vigenciaActual) {
                params.vigenciaId = req.vigenciaActual.id;
            }

            const data = await estudianteService.list(params);

            return sendSuccess(res, data, "Listado de estudiantes obtenido exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /estudiantes/:id
     */
    async get(req, res, next) {
        try {
            const id = Number(req.params.id);

            const includeMatriculas = req.query.includeMatriculas === "true";
            const vigenciaId = includeMatriculas && req.vigenciaActual
                ? req.vigenciaActual.id
                : null;

            const data = await estudianteService.get(id, {
                includeMatriculas,
                vigenciaId
            });

            return sendSuccess(res, data, "Información del estudiante obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /estudiantes
     */
    async create(req, res, next) {
        try {
            const data = await estudianteService.create(req.body);

            return sendSuccess(
                res,
                data,
                "El estudiante fue registrado exitosamente.",
                201
            );

        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /estudiantes/:id
     */
    async update(req, res, next) {
        try {
            const id = Number(req.params.id);

            const data = await estudianteService.update(id, req.body);

            return sendSuccess(
                res,
                data,
                "El estudiante fue actualizado exitosamente."
            );

        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /estudiantes/:id
     */
    async remove(req, res, next) {
        try {
            const id = Number(req.params.id);

            await estudianteService.remove(id);

            return sendSuccess(
                res,
                null,
                "El estudiante fue eliminado exitosamente."
            );

        } catch (error) {
            next(error);
        }
    },

    async addAcudiente(req, res, next) {
        try {
            const estudianteId = Number(req.params.id);
            // req.body debe traer { acudienteId, afinidad }
            await estudianteService.addAcudiente(estudianteId, req.body);

            return sendSuccess(res, null, "Acudiente asignado existosamente.");
        } catch (error) {
            next(error);
        }
    },

    async removeAcudiente(req, res, next) {
        try {
            const estudianteId = Number(req.params.id);
            const acudienteId = Number(req.params.acudienteId);

            await estudianteService.removeAcudiente(estudianteId, acudienteId);

            return sendSuccess(res, null, "Acudiente desvinculado existosamente.");
        } catch (error) {
            next(error);
        }
    }
};