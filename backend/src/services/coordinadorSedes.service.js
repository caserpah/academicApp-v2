import { coordinadorSedesRepository } from "../repositories/coordinadorSedes.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";
import { getVigenciaFromRequest, getVigenciaActiva } from "../utils/vigencia.helper.js";

export const coordinadorSedesService = {

    async list(params, req) {
        const vigencia = getVigenciaFromRequest(req);
        return coordinadorSedesRepository.findAll({
            ...params,
            vigenciaId: vigencia.id,
        });
    },

    async get(id) {
        const item = await coordinadorSedesRepository.findById(id);
        if (!item) {
            const err = new Error("No se encontró la asignación solicitada.");
            err.status = 404;
            throw err;
        }
        return item;
    },

    async create(data, req) {
        try {
            const vigencia = getVigenciaFromRequest(req);

            const {
                coordinadorId,
                sedeId,
                jornada = "MANANA",
            } = data;

            const payload = {
                coordinadorId,
                sedeId,
                jornada,
                vigenciaId: vigencia.id,
            };

            const nueva = await coordinadorSedesRepository.create(payload);

            return {
                message: "La asignación del coordinador a la sede fue registrada exitosamente.",
                data: nueva,
            };
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async update(id, data) {
        try {
            const existente = await coordinadorSedesRepository.findById(id);
            if (!existente) {
                const err = new Error("No se encontró la asignación solicitada.");
                err.status = 404;
                throw err;
            }

            const { jornada } = data;

            const payload = {};
            if (jornada) payload.jornada = jornada;

            const actualizada = await coordinadorSedesRepository.updateById(id, payload);

            return {
                message: "La asignación del coordinador fue actualizada exitosamente.",
                data: actualizada,
            };
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async remove(id) {
        try {
            const item = await coordinadorSedesRepository.findById(id);
            if (!item) {
                const err = new Error("No se encontró la asignación solicitada.");
                err.status = 404;
                throw err;
            }
            await coordinadorSedesRepository.deleteById(id);
            return { message: "La asignación del coordinador fue eliminada exitosamente." };

        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "esta asignación",
                "registros académicos asociados"
            );
        }
    },
};