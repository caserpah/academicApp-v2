import { Vigencia } from "../models/vigencia.js";

/**
 * Repository de Vigencia
 * ----------------------
 * Solo operaciones de acceso a datos (sin reglas de negocio).
 * - Soporta paginación, filtros y orden.
 * - Permite controlar los atributos a devolver (útil para ocultar 'observaciones').
 */
export const vigenciaRepository = {
    async findAll({
        page = 1,
        limit = 20,
        activa,
        anio,
        orderBy = "anio",
        order = "DESC",
        attributes = null, // array de campos o { exclude: [...] }
    } = {}) {
        const where = {};
        if (typeof activa !== "undefined") where.activa = activa;
        if (typeof anio !== "undefined") where.anio = Number(anio);

        const offset = (Number(page) - 1) * Number(limit);

        const { rows, count } = await Vigencia.findAndCountAll({
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
        return Vigencia.findByPk(id, {
            attributes: attributes || undefined,
        });
    },

    async create(payload) {
        return Vigencia.create(payload);
    },

    async updateById(id, payload) {
        const registro = await Vigencia.findByPk(id);
        if (!registro) return null;
        await registro.update(payload);
        return registro;
    },

    async deleteById(id) {
        return Vigencia.destroy({ where: { id } });
    },
};