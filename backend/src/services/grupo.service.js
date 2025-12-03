import { grupoRepository } from "../repositories/grupo.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

export const grupoService = {

    /**
     * Listar grupos (cualquier rol puede listar).
     */
    async list(params, vigenciaId) {
        const {
            page = 1,
            limit = 10,
            orderBy = "gradoId",
            order = "ASC"
        } = params;

        return grupoRepository.findAll({
            ...params,
            vigenciaId,
            page,
            limit,
            orderBy,
            order
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
     * Crear grupo (solo admin).
     */
    async create(data, vigenciaId, rolUsuario) {

        if (rolUsuario !== "admin") {
            const err = new Error("No tiene permisos para crear grupos.");
            err.status = 403;
            throw err;
        }

        try {
            const nuevo = await grupoRepository.create({
                ...data,
                vigenciaId,
            });

            return grupoRepository.findById(nuevo.id, vigenciaId);

        } catch (error) {

            // Manejar índice único del grupo
            if (error?.original?.constraint === "idx_grupo_unico" ||
                error?.original?.index === "idx_grupo_unico") {

                const err = new Error(
                    "Ya existe un grupo con el mismo nombre, grado, jornada, sede y vigencia."
                );
                err.status = 400;
                throw err;
            }

            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar grupo (solo admin).
     */
    async update(id, data, vigenciaId, rolUsuario) {

        if (rolUsuario !== "admin") {
            const err = new Error("No tiene permisos para actualizar grupos.");
            err.status = 403;
            throw err;
        }

        try {

            const actual = await grupoRepository.findById(id, vigenciaId);
            if (!actual) {
                const err = new Error("No se encontró el grupo solicitado.");
                err.status = 404;
                throw err;
            }

            await grupoRepository.updateById(id, vigenciaId, data);

            return grupoRepository.findById(id, vigenciaId);

        } catch (error) {

            // Índice único
            if (error?.original?.constraint === "idx_grupo_unico" ||
                error?.original?.index === "idx_grupo_unico") {

                const err = new Error(
                    "Ya existe un grupo con el mismo nombre, grado, jornada, sede y vigencia."
                );
                err.status = 400;
                throw err;
            }

            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar grupo (solo admin).
     */
    async remove(id, vigenciaId, rolUsuario) {

        if (rolUsuario !== "admin") {
            const err = new Error("No tiene permisos para eliminar grupos.");
            err.status = 403;
            throw err;
        }

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
            throw handleSequelizeError(error);
        }
    },
};