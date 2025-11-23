import { Op } from "sequelize";
import { Coordinador } from "../models/coordinador.js";

export const coordinadorRepository = {
    async findAll({
        page = 1,
        limit = 20,
        nombre,
        documento,
        orderBy = "nombre",
        order = "ASC",
        attributes = null,
    } = {}) {
        const where = {};

        if (nombre) {
            where.nombre = { [Op.like]: `%${nombre}%` };
        }

        if (documento) {
            where.documento = { [Op.like]: `%${documento}%` };
        }

        const offset = (Number(page) - 1) * Number(limit);

        const { rows, count } = await Coordinador.findAndCountAll({
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
        return Coordinador.findByPk(id, { attributes: attributes || undefined });
    },

    async create(payload) {
        return Coordinador.create(payload);
    },

    async updateById(id, payload) {
        const item = await Coordinador.findByPk(id);
        if (!item) return null;
        await item.update(payload);
        return item;
    },

    async deleteById(id) {
        return Coordinador.destroy({ where: { id } });
    },
};