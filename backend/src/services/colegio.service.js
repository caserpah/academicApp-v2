import { colegioRepository } from "../repositories/colegio.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

export const colegioService = {
    /**
     * Listar colegios con filtros opcionales
     */
    async list(params) {
        return colegioRepository.findAll(params);
    },

    /**
     * Obtener un colegio por ID
     */
    async get(id) {
        const colegio = await colegioRepository.findById(id);
        if (!colegio) {
            const err = new Error("No se encontró el colegio solicitado.");
            err.status = 404;
            throw err;
        }
        return colegio;
    },

    /**
     * Crear un nuevo colegio
     */
    async create(data) {
        try {
            const {
                registroDane,
                nombre,
                email,
                contacto,
                direccion,
                ciudad,
                departamento,
                resolucion,
                fechaResolucion,
                promocion,
                fechaPromocion,
                secretaria,
                ccSecretaria,
                director,
                ccDirector,
            } = data;

            const payload = {
                registroDane,
                nombre,
                email,
                contacto,
                direccion,
                ciudad,
                departamento,
                resolucion,
                fechaResolucion,
                promocion,
                fechaPromocion,
                secretaria,
                ccSecretaria,
                director,
                ccDirector,
            };

            const nuevo = await colegioRepository.create(payload);

            return {
                message: "El colegio fue registrado exitosamente.",
                data: nuevo,
            };
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar un colegio existente
     */
    async update(id, data) {
        try {
            const existente = await colegioRepository.findById(id);
            if (!existente) {
                const err = new Error("No se encontró el colegio solicitado.");
                err.status = 404;
                throw err;
            }

            const {
                registroDane,
                nombre,
                email,
                contacto,
                direccion,
                ciudad,
                departamento,
                resolucion,
                fechaResolucion,
                promocion,
                fechaPromocion,
                secretaria,
                ccSecretaria,
                director,
                ccDirector,
            } = data;

            const payload = {
                registroDane,
                nombre,
                email,
                contacto,
                direccion,
                ciudad,
                departamento,
                resolucion,
                fechaResolucion,
                promocion,
                fechaPromocion,
                secretaria,
                ccSecretaria,
                director,
                ccDirector,
            };

            const actualizado = await colegioRepository.updateById(id, payload);

            return {
                message: "El colegio fue actualizado exitosamente.",
                data: actualizado,
            };
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar un colegio (solo si no tiene sedes asociadas)
     */
    async remove(id) {
        try {
            const colegio = await colegioRepository.findById(id);
            if (!colegio) {
                const err = new Error("No se encontró el colegio solicitado.");
                err.status = 404;
                throw err;
            }

            // Intentar eliminar; si tiene relaciones, formatear error de FK
            await colegioRepository.deleteById(id);

            return {
                message: "El colegio fue eliminado exitosamente.",
            };
        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "este colegio",
                "sedes asociadas"
            );
        }
    },
};