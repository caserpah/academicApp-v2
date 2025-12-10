import { Op } from "sequelize";
import { Docente } from "../models/docente.js";
import { Area } from "../models/area.js";

export const docenteRepository = {

    /**
     * Listado con filtros + paginación + ordenamiento
     */
    async findAll({
        documento,
        nombre,
        apellidos,
        nivelEducativo,
        nivelEnsenanza,
        vinculacion,
        areaId,
        activo,
        page,
        limit,
        orderBy,
        order
    }) {

        const where = {};

        /** Filtros */

        if (documento) {
            where.documento = { [Op.like]: `%${documento}%` };
        }

        if (nombre) {
            where.nombre = { [Op.like]: `%${nombre}%` };
        }

        if (apellidos) {
            where.apellidos = { [Op.like]: `%${apellidos}%` };
        }

        if (nivelEducativo) {
            where.nivelEducativo = nivelEducativo;
        }

        if (nivelEnsenanza) {
            where.nivelEnsenanza = nivelEnsenanza;
        }

        if (vinculacion) {
            where.vinculacion = vinculacion;
        }

        if (areaId) {
            where.areaId = areaId;
        }

        if (activo !== undefined) {
            // permitir activo=true, activo=false
            where.activo = activo;
        }

        /** Paginación */
        const offset = (page - 1) * limit;

        /** Consulta */
        const { rows, count } = await Docente.findAndCountAll({
            where,
            limit,
            offset,
            order: [[orderBy, order]],
            include: [
                {
                    model: Area,
                    as: "area",
                    attributes: ["id", "nombre", "codigo"]
                }
            ]
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        };
    },

    /**
     * Buscar por ID
     */
    findById(id) {
        return Docente.findOne({
            where: { id },
            include: [
                {
                    model: Area,
                    as: "area",
                    attributes: ["id", "nombre", "codigo"]
                }
            ]
        });
    },

    /**
     * Crear un docente
     */
    create(data) {
        return Docente.create(data);
    },

    /**
     * Actualizar docente por ID
     */
    async updateById(id, data) {
        const registro = await Docente.findByPk(id);
        if (!registro) return null;

        await registro.update(data);
        return registro;
    },

    /**
     * Eliminar docente por ID
     */
    async deleteById(id) {
        const registro = await Docente.findByPk(id);
        if (!registro) return false;

        await registro.destroy();
        return true;
    },
};