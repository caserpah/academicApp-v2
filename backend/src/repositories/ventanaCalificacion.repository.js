import { Op } from "sequelize";
import { VentanaCalificacion } from "../models/ventana_calificacion.js";
import { Vigencia } from "../models/vigencia.js";

export const ventanaCalificacionRepository = {
    /**
     * Listado con filtros y paginación
     */
    async findAll({
        page = 1,
        limit = 20,
        busqueda,
        vigenciaId,
        habilitada
    } = {}) {
        const where = {};

        if (vigenciaId) where.vigenciaId = vigenciaId;
        if (habilitada !== undefined) where.habilitada = habilitada === 'true' || habilitada === true;

        if (busqueda) {
            where.descripcion = { [Op.like]: `%${busqueda}%` };
        }

        const offset = (Number(page) - 1) * Number(limit);

        const { rows, count } = await VentanaCalificacion.findAndCountAll({
            where,
            offset,
            limit: Number(limit),
            order: [['periodo', 'ASC']],
            include: [
                {
                    model: Vigencia,
                    as: "vigencia",
                    attributes: ["id", "anio"]
                }
            ]
        });

        return {
            items: rows,
            total: count,
            page: Number(page),
            limit: Number(limit),
        };
    },

    findById(id) {
        return VentanaCalificacion.findByPk(id, {
            include: [{ model: Vigencia, as: "vigencia" }]
        });
    },

    async create(payload, transaction) {
        return VentanaCalificacion.create(payload, { transaction });
    },

    async updateById(id, payload, transaction) {
        const registro = await VentanaCalificacion.findByPk(id);
        if (!registro) return null;
        return registro.update(payload, { transaction });
    },

    async deleteById(id, transaction) {
        return VentanaCalificacion.destroy({ where: { id }, transaction });
    }
};