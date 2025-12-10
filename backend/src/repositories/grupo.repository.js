import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Sede } from "../models/sede.js";
import { Docente } from "../models/docente.js";

export const grupoRepository = {

    /**
     * Listar grupos con filtros, paginación y ordenamiento.
     */
    async findAll({
        nombre,
        gradoId,
        jornada,
        sedeId,
        vigenciaId,
        page,
        limit,
        orderBy,
        order
    }) {

        const where = {};

        if (vigenciaId) where.vigenciaId = vigenciaId;
        if (nombre) where.nombre = nombre;
        if (gradoId) where.gradoId = gradoId;
        if (jornada) where.jornada = jornada;
        if (sedeId) where.sedeId = sedeId;

        const offset = (page - 1) * limit;

        const { rows, count } = await Grupo.findAndCountAll({
            where,
            limit,
            offset,
            order: [[orderBy, order]],
            include: [
                {
                    model: Grado,
                    as: "grado",
                    attributes: ["id", "nombre", "codigo", "modalidad"]
                },
                {
                    model: Sede,
                    as: "sede",
                    attributes: ["id", "nombre"]
                },
                {
                    model: Docente,
                    as: "director",
                    attributes: ["id", "nombre", "apellidos"]
                }
            ]
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            }
        };
    },

    /**
     * Buscar un grupo por ID y vigencia.
     */
    findById(id, vigenciaId) {
        return Grupo.findOne({
            where: { id, vigenciaId },
            include: [
                {
                    model: Grado,
                    as: "grado",
                    attributes: ["id", "nombre", "codigo", "modalidad"]
                },
                {
                    model: Sede,
                    as: "sede",
                    attributes: ["id", "nombre"]
                },
                {
                    model: Docente,
                    as: "director",
                    attributes: ["id", "nombre", "apellidos"]
                }
            ]
        });
    },

    /**
     * Crear grupo.
     */
    create(data) {
        return Grupo.create(data);
    },

    /**
     * Actualizar grupo por ID.
     */
    async updateById(id, vigenciaId, data) {
        const registro = await Grupo.findOne({ where: { id, vigenciaId } });
        if (!registro) return null;

        await registro.update(data);
        return registro;
    },

    /**
     * Eliminar grupo.
     */
    async deleteById(id, vigenciaId) {
        const registro = await Grupo.findOne({ where: { id, vigenciaId } });
        if (!registro) return false;

        await registro.destroy();
        return true;
    },
};