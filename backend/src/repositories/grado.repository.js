import { Grado } from "../models/grado.js";
import { ConfigGrado } from "../models/config_grado.js";

export const gradoRepository = {
    async findAll() {
        return Grado.findAll({
            where: { activo: true },
            order: [['orden', 'ASC']]
        });
    },

    async findGradoYConfiguracion(gradoId, transaction) {
        const grado = await Grado.findByPk(gradoId, { transaction });
        const config = await ConfigGrado.findOne({ where: { gradoId }, transaction });
        return { grado, config };
    },
};
