import { Juicio } from "../models/juicio.js";
import { Asignatura } from "../models/asignatura.js"

export const juicioRepository = {

    /**
     * Listado con paginación y filtros.
     * @param {object} options
     *  - filters: where
     *  - page: número de página (1-based)
     *  - limit: registros por página
     *  - orderBy: campo de ordenamiento
     *  - order: "ASC" | "DESC"
     */
    async findAll({ filters, page, limit, orderBy, order }) {
        const offset = (page - 1) * limit;

        const { rows, count } = await Juicio.findAndCountAll({
            where: filters,
            order: [[orderBy, order]],
            limit,
            offset,
            include: [
                {
                    model: Asignatura,
                    as: "asignatura",
                    attributes: ["codigo", "nombre", "abreviatura"]
                }
            ]
        });

        return { rows, count };
    },

    async findById(id, vigenciaId) {
        return Juicio.findOne({
            where: { id, vigenciaId },
            include: [
                {
                    model: Asignatura,
                    as: "asignatura",
                    attributes: ["codigo", "nombre", "abreviatura"]
                }
            ]
        });
    },

    async create(data) {
        return Juicio.create(data);
    },

    async updateById(id, data) {
        const registro = await Juicio.findByPk(id);
        if (!registro) return null;

        await registro.update(data);
        return registro;
    },

    async deleteById(id) {
        const registro = await Juicio.findByPk(id);
        if (!registro) return false;
        await registro.destroy();
        return true;
    },
};