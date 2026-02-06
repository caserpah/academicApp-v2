import { juicioRepository } from "../repositories/juicio.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

export const juicioService = {

    /**
     * Listado con filtros, ordenamiento y paginación.
     */
    async list(params, vigenciaId) {
        const page = Number(params.page) || 1;
        const limit = Number(params.limit) || 10;

        const orderBy = params.orderBy || "gradoId";
        const order = params.order || "DESC";

        return juicioRepository.findAll({
            ...params,
            page,
            limit,
            orderBy,
            order,
            vigenciaId
        });
    },

    async get(id, vigenciaId) {
        const registro = await juicioRepository.findById(id, vigenciaId);
        if (!registro) {
            const err = new Error("No se encontró el juicio solicitado.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    async create(data, vigenciaId) {
        try {
            const {
                gradoId,
                dimensionId,
                desempenoId,
                asignaturaId,
                periodo,
                texto,
                activo,
            } = data;

            const nuevo = await juicioRepository.create({
                gradoId,
                dimensionId: dimensionId ?? null,
                desempenoId,
                asignaturaId,
                periodo,
                texto,
                activo: activo ?? true,
                vigenciaId,
            });

            return juicioRepository.findById(nuevo.id, vigenciaId);
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async update(id, data, vigenciaId) {
        try {
            const actual = await juicioRepository.findById(id, vigenciaId);
            if (!actual) {
                const err = new Error("No se encontró el juicio solicitado.");
                err.status = 404;
                throw err;
            }

            // Desestructuración — solo campos actualizables
            const camposActualizables = {};
            [
                "gradoId",
                "dimensionId",
                "desempenoId",
                "asignaturaId",
                "periodo",
                "texto",
                "activo",
            ].forEach((campo) => {
                if (data[campo] !== undefined) {
                    camposActualizables[campo] =
                        campo === "dimensionId" && data[campo] === null ? null : data[campo];
                }
            });

            await juicioRepository.updateById(id, camposActualizables);

            return juicioRepository.findById(id, vigenciaId);
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async remove(id, vigenciaId) {
        try {
            const registro = await juicioRepository.findById(id, vigenciaId);

            if (!registro) {
                const err = new Error("No se encontró el juicio solicitado.");
                err.status = 404;
                throw err;
            }

            await juicioRepository.deleteById(id, vigenciaId);
            return true;
        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "este juicio",
                "calificaciones asociadas"
            );
        }
    },
};