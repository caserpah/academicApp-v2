import { Indicador } from "../models/indicador.js";

export const indicadorRepository = {

    async findAll(filters) {
        return Indicador.findAll({
            where: filters,
            order: [["periodo", "ASC"]],
        });
    },

    async findById(id, vigenciaId) {
        return Indicador.findOne({
            where: { id, vigenciaId }
        });
    },

    async create(data) {
        return Indicador.create(data);
    },

    async updateById(id, data) {
        const registro = await Indicador.findByPk(id);
        if (!registro) return null;
        await registro.update(data);
        return registro;
    },

    async deleteById(id) {
        const registro = await Indicador.findByPk(id);
        if (!registro) return false;
        await registro.destroy();
        return true;
    }
};