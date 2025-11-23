import { Colegio } from "../models/colegio.js";

export const colegioRepository = {
    async findAll({
        page = 1,
        limit = 20,
        nombre,
        ciudad,
        registroDane,
        orderBy = "nombre",
        order = "ASC",
        attributes = null,
    } = {}) {
        const where = {};
        if (nombre) where.nombre = { [Op.like]: `%${nombre}%` };
        if (ciudad) where.ciudad = { [Op.like]: `%${ciudad}%` };
        if (registroDane) where.registroDane = registroDane;

        const offset = (Number(page) - 1) * Number(limit);

        const { rows, count } = await Colegio.findAndCountAll({
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
        return Colegio.findByPk(id, { attributes: attributes || undefined });
    },

    async create(payload) {
        return Colegio.create(payload);
    },

    async updateById(id, payload) {
        const registro = await Colegio.findByPk(id);
        if (!registro) return null;
        await registro.update(payload);
        return registro;
    },

    async deleteById(id) {
        return Colegio.destroy({ where: { id } });
    },
};