import { desempenoRangoRepository } from "../repositories/desempenoRango.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

export const desempenoRangoService = {
    list(vigenciaId) {
        return desempenoRangoRepository.findAll(vigenciaId);
    },

    async get(id, vigenciaId) {
        const registro = await desempenoRangoRepository.findById(id, vigenciaId);
        if (!registro) {
            const err = new Error("No se encontró el rango de desempeño solicitado.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    async create(data, vigenciaId) {
        try {
            const { desempenoId, minNota, maxNota } = data;

            const nuevo = await desempenoRangoRepository.create({
                desempenoId,
                minNota,
                maxNota,
                vigenciaId,
            });

            return desempenoRangoRepository.findById(nuevo.id, vigenciaId);
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async update(id, data, vigenciaId) {
        try {
            const actual = await desempenoRangoRepository.findById(id, vigenciaId);
            if (!actual) {
                const err = new Error("No se encontró el rango de desempeño solicitado.");
                err.status = 404;
                throw err;
            }

            await desempenoRangoRepository.updateById(id, data);

            return desempenoRangoRepository.findById(id, vigenciaId);
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async remove(id, vigenciaId) {
        const ok = await desempenoRangoRepository.deleteById(id, vigenciaId);
        if (!ok) {
            const err = new Error("No se encontró el rango de desempeño solicitado.");
            err.status = 404;
            throw err;
        }
        return true;
    },
};