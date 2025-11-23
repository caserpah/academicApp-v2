import { juicioRepository } from "../repositories/juicio.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

export const juicioService = {

    /**
     * Listado con filtros, ordenamiento y paginación.
     */
    async list(params, vigenciaId) {
        const {
            page = 1,
            limit = 10,
            orderBy = "grado",
            order = "ASC",
            grado,
            dimension,
            periodo,
            asignaturaId,
            tipo,
            desempeno,
            activo,
        } = params;

        const pageNumber = Number(page) > 0 ? Number(page) : 1;
        const limitNumber =
            Number(limit) > 0 && Number(limit) <= 100 ? Number(limit) : 10;

        const allowedOrderBy = [
            "grado",
            "periodo",
            "dimension",
            "desempeno",
            "tipo",
            "asignaturaId",
            "id",
        ];
        const orderByField = allowedOrderBy.includes(orderBy) ? orderBy : "grado";

        const orderDirection =
            String(order).toUpperCase() === "DESC" ? "DESC" : "ASC";

        const filters = { vigenciaId };

        if (grado) filters.grado = grado;
        if (dimension) filters.dimension = dimension;
        if (periodo) filters.periodo = Number(periodo);
        if (asignaturaId) filters.asignaturaId = Number(asignaturaId);
        if (tipo) filters.tipo = tipo;
        if (desempeno) filters.desempeno = desempeno;
        if (activo !== undefined) {
            if (activo === "true" || activo === true) filters.activo = true;
            else if (activo === "false" || activo === false) filters.activo = false;
        }

        const { rows, count } = await juicioRepository.findAll({
            filters,
            page: pageNumber,
            limit: limitNumber,
            orderBy: orderByField,
            order: orderDirection,
        });

        const totalPages = count > 0 ? Math.ceil(count / limitNumber) : 1;

        return {
            items: rows,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total: count,
                totalPages,
            },
        };
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
                tipo,
                grado,
                dimension,
                desempeno,
                minNota,
                maxNota,
                texto,
                periodo,
                asignaturaId,
                activo,
            } = data;

            const nuevo = await juicioRepository.create({
                tipo,
                grado,
                dimension,
                desempeno,
                minNota,
                maxNota,
                texto,
                periodo,
                asignaturaId,
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

            if (data.tipo !== undefined) camposActualizables.tipo = data.tipo;
            if (data.grado !== undefined) camposActualizables.grado = data.grado;
            if (data.dimension !== undefined) camposActualizables.dimension = data.dimension;
            if (data.desempeno !== undefined) camposActualizables.desempeno = data.desempeno;
            if (data.minNota !== undefined) camposActualizables.minNota = data.minNota;
            if (data.maxNota !== undefined) camposActualizables.maxNota = data.maxNota;
            if (data.texto !== undefined) camposActualizables.texto = data.texto;
            if (data.periodo !== undefined) camposActualizables.periodo = data.periodo;
            if (data.asignaturaId !== undefined) camposActualizables.asignaturaId = data.asignaturaId;
            if (data.activo !== undefined) camposActualizables.activo = data.activo;

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

            await juicioRepository.deleteById(id);
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