import { Op } from "sequelize";
import { Sede } from "../models/sede.js";

export const sedeRepository = {
    async findAll({
        page = 1,
        limit = 20,
        nombre,
        codigo,
        orderBy = "nombre",
        order = "ASC",
        attributes = null,
    } = {}) {
        const where = {};

        if (nombre) {
            where.nombre = { [Op.like]: `%${nombre}%` };
        }

        if (codigo) {
            where.codigo = { [Op.like]: `%${codigo}%` };
        }

        const offset = (Number(page) - 1) * Number(limit);

        const { rows, count } = await Sede.findAndCountAll({
            where,
            offset,
            limit: Number(limit),
            order: [[orderBy, order]],
            attributes: attributes || undefined,
        });

        return {
            items: rows,
            total: count,
            page: Number(page),
            limit: Number(limit),
        };
    },

    async findById(id, { attributes = null } = {}) {
        return Sede.findByPk(id, { attributes: attributes || undefined });
    },

    async create(payload) {
        return Sede.create(payload);
    },

    async updateById(id, payload) {
        const registro = await Sede.findByPk(id);
        if (!registro) return null;
        await registro.update(payload);
        return registro;
    },

    async deleteById(id) {
        return Sede.destroy({ where: { id } });
    },
};