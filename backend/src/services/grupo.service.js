import { grupoRepository } from "../repositories/grupo.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

export const grupoService = {

    /**
     * Listar grupos (cualquier rol puede listar).
     */
    async list(params, vigenciaId) {
        const page = Number(params.page) || 1;
        const limit = Number(params.limit) || 10;

        const orderBy = params.orderBy || "gradoId";
        const order = params.order || "ASC";

        return grupoRepository.findAll({
            ...params,
            page,
            limit,
            orderBy,
            order,
            vigenciaId
        });
    },

    /**
     * Obtener grupo por ID.
     * (cualquier rol puede consultar)
     */
    async get(id, vigenciaId) {
        const registro = await grupoRepository.findById(id, vigenciaId);

        if (!registro) {
            const err = new Error("No se encontró el grupo solicitado.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    /**
     * Crear grupo
     */
    async create(data, vigenciaId) {
        try {
            const {
                nombre,
                gradoId,
                jornada,
                sedeId,
                directorId
            } = data;

            const nuevo = await grupoRepository.create({
                nombre,
                gradoId,
                jornada,
                sedeId,
                directorId: directorId ?? null,
                vigenciaId
            });

            return grupoRepository.findById(nuevo.id, vigenciaId);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar grupo (solo admin).
     */
    async update(id, data, vigenciaId) {
        try {
            const actual = await grupoRepository.findById(id, vigenciaId);

            if (!actual) {
                const err = new Error("No se encontró el grupo solicitado.");
                err.status = 404;
                throw err;
            }

            // Desestructuración — solo campos actualizables
            const camposActualizables = {};

            if (data.nombre !== undefined) camposActualizables.nombre = data.nombre;
            if (data.gradoId !== undefined) camposActualizables.gradoId = data.gradoId;
            if (data.jornada !== undefined) camposActualizables.jornada = data.jornada;
            if (data.sedeId !== undefined) camposActualizables.sedeId = data.sedeId;
            if (data.directorId !== undefined) camposActualizables.directorId = data.directorId;

            await actual.update(camposActualizables);

            return grupoRepository.findById(id, vigenciaId);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar grupo (solo admin).
     */
    async remove(id, vigenciaId) {
        try {
            const registro = await grupoRepository.findById(id, vigenciaId);

            if (!registro) {
                const err = new Error("No se encontró el grupo solicitado.");
                err.status = 404;
                throw err;
            }

            await grupoRepository.deleteById(id, vigenciaId);
            return true;

        } catch (error) {
            console.log(error);
            throw formatearErrorForaneo(
                error,
                "este grupo",
                "cargas académicas o matrículas asociadas"
            );
        }
    },
};