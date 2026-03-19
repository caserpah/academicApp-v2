import { cargaService } from "../services/carga.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";
import { Docente } from "../models/docente.js";

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
    },

    /**
     * Vincula Usuario -> Docente a través del usuarioId.
     * Luego, lista la carga académica del docente logueado.
     */
    async listMisCargas(req, res, next) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const usuarioId = req.user.id; // ID del usuario logueado (token)

            // Buscar al Docente usando directamente el ID del usuario
            const docente = await Docente.findOne({
                where: { usuarioId: usuarioId }
            });

            if (!docente) {
                // El usuario existe, pero no está registrado en la tabla de docentes
                return sendSuccess(res, { items: [] }, "El usuario actual no está registrado como docente.");
            }

            // Listar la carga usando el ID del docente encontrado
            const filtros = {
                docenteId: docente.id,
                limit: 100 // Traer todo sin paginar
            };

            const data = await cargaService.list(filtros, vigenciaId);

            return sendSuccess(res, data, "Carga académica del docente obtenida.");

        } catch (error) {
            next(error);
        }
    },
};