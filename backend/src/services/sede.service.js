import { sedeRepository } from "../repositories/sede.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";
import { Colegio } from "../models/colegio.js";

export const sedeService = {

    async list(params) {
        return await sedeRepository.findAll(params);
    },

    async obtener(id) {
        const registro = await sedeRepository.findById(id);
        if (!registro) {
            const err = new Error("No se encontró la sede solicitada.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    async create(data) {
        try {
            const colegio = await Colegio.findOne();
            if (!colegio) {
                const err = new Error(
                    "Debe registrar primero la información del colegio antes de crear sedes."
                );
                err.status = 409;
                throw err;
            }

            const { codigo, nombre, direccion, contacto } = data;

            const payload = {
                codigo,
                nombre,
                direccion,
                contacto,
                colegioId: colegio.id, // asignación automática
            };

            const nueva = await sedeRepository.create(payload);

            return {
                message: "La sede fue registrada exitosamente.",
                data: nueva,
            };
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async update(id, data) {
        try {
            const existente = await sedeRepository.findById(id);
            if (!existente) {
                const err = new Error("No se encontró la sede solicitada.");
                err.status = 404;
                throw err;
            }

            const { codigo, nombre, direccion, contacto } = data;

            const payload = {
                codigo,
                nombre,
                direccion,
                contacto,
            };

            const actualizada = await sedeRepository.updateById(id, payload);

            return {
                message: "La sede fue actualizada exitosamente.",
                data: actualizada,
            };
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async remove(id) {
        try {
            const registro = await sedeRepository.findById(id);
            if (!registro) {
                const err = new Error("No se encontró la sede solicitada.");
                err.status = 404;
                throw err;
            }

            await sedeRepository.deleteById(id);

            return { message: "La sede fue eliminada exitosamente." };
        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "esta sede",
                "otros registros asociados"
            );
        }
    },
};