import { DesempenoRango } from "../models/desempeno_rango.js";
import { Desempeno } from "../models/desempeno.js";

export const desempenoRangoRepository = {
    async findAll(vigenciaId) {
        return DesempenoRango.findAll({
            where: { vigenciaId },
            include: [{ model: Desempeno, as: "desempeno" }],
            order: [["desempenoId", "ASC"]],
        });
    },

    async findById(id, vigenciaId) {
        return DesempenoRango.findOne({
            where: { id, vigenciaId },
            include: [{ model: Desempeno, as: "desempeno" }],
        });
    },

    create(data) {
        return DesempenoRango.create(data);
    },

    async updateById(id, data) {
        const registro = await DesempenoRango.findByPk(id);
        if (!registro) return null;
        await registro.update(data);
        return registro;
    },

    async deleteById(id, vigenciaId) {
        const registro = await DesempenoRango.findOne({ where: { id, vigenciaId } });
        if (!registro) return false;
        await registro.destroy();
        return true;
    },
};