import { areaRepository } from "../repositories/area.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

/**
 * Service: Area
 * Encapsula la lógica de negocio para las áreas académicas.
 */
export const areaService = {

    async list(params, vigenciaId) {
        try {
            return await areaRepository.findAll({
                ...params,
                vigenciaId,
                includeVigencia: true,
            });
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Obtener detalle de un área.
     */
    async get(id, vigenciaId) {
        try {
            const area = await areaRepository.findById(id, {
                includeVigencia: true,
            });

            if (!area || area.vigenciaId !== vigenciaId) {
                const err = new Error("No se encontró el área solicitada.");
                err.status = 404;
                throw err;
            }

            return area;

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Crear nueva área (usa la vigencia activa).
     */
    async create(data, vigenciaId) {
        try {
            const {
                codigo,
                nombre,
                abreviatura,
                promociona,
            } = data;

            const area = await areaRepository.create({
                codigo,
                nombre,
                abreviatura,
                promociona,
                vigenciaId,
            });

            return await areaRepository.findById(area.id, {
                includeVigencia: true,
            });

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar área existente.
     */
    async update(id, data, vigenciaId) {
        try {
            const area = await areaRepository.findById(id);

            if (!area || area.vigenciaId !== vigenciaId) {
                const err = new Error("No se encontró el área solicitada.");
                err.status = 404;
                throw err;
            }

            const camposActualizables = {};

            if (data.codigo !== undefined) camposActualizables.codigo = data.codigo;
            if (data.nombre !== undefined) camposActualizables.nombre = data.nombre;
            if (data.abreviatura !== undefined) camposActualizables.abreviatura = data.abreviatura;
            if (data.promociona !== undefined) camposActualizables.promociona = data.promociona;

            const actualizado = await areaRepository.updateById(id, camposActualizables);

            if (!actualizado) {
                const err = new Error("No se pudo actualizar el área.");
                err.status = 500;
                throw err;
            }

            return await areaRepository.findById(id, {
                includeVigencia: true,
            });

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },
    /**

     * Eliminar área.
     */
    async remove(id, vigenciaId) {
        try {
            const area = await areaRepository.findById(id);

            if (!area || area.vigenciaId !== vigenciaId) {
                const err = new Error("No se encontró el área solicitada.");
                err.status = 404;
                throw err;
            }

            const eliminadas = await areaRepository.deleteById(id);

            if (eliminadas === 0) {
                const err = new Error("No se pudo eliminar el área.");
                err.status = 500;
                throw err;
            }

            return { message: "El área fue eliminada exitosamente." };

        } catch (error) {
            const errTransformado = formatearErrorForaneo(
                error,
                "esta área",
                "asignaturas asociadas"
            );
            throw handleSequelizeError(errTransformado);
        }
    }
};