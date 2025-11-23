import { coordinadorRepository } from "../repositories/coordinador.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

export const coordinadorService = {
    async list(params) {
        return coordinadorRepository.findAll(params);
    },

    async get(id) {
        const registro = await coordinadorRepository.findById(id);
        if (!registro) {
            const err = new Error("No se encontró el coordinador solicitado.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    async create(data) {
        try {
            const {
                documento,
                nombre,
                email,
                telefono,
                direccion,
            } = data;

            const payload = {
                documento,
                nombre,
                email,
                telefono,
                direccion,
            };

            const nuevo = await coordinadorRepository.create(payload);

            return {
                message: "El coordinador fue registrado exitosamente.",
                data: nuevo,
            };
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async update(id, data) {
        try {
            const existente = await coordinadorRepository.findById(id);
            if (!existente) {
                const err = new Error("No se encontró el coordinador solicitado.");
                err.status = 404;
                throw err;
            }

            const {
                documento,
                nombre,
                email,
                telefono,
                direccion,
            } = data;

            const payload = {
                documento,
                nombre,
                email,
                telefono,
                direccion,
            };

            const actualizado = await coordinadorRepository.updateById(id, payload);

            return {
                message: "El coordinador fue actualizado exitosamente.",
                data: actualizado,
            };
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async remove(id) {
        try {
            const registro = await coordinadorRepository.findById(id);
            if (!registro) {
                const err = new Error("No se encontró el coordinador solicitado.");
                err.status = 404;
                throw err;
            }

            await coordinadorRepository.deleteById(id);

            return { message: "El coordinador fue eliminado exitosamente." };
        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "este coordinador",
                "sedes o registros académicos asociados"
            );
        }
    },
};