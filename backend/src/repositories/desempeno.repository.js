import { Desempeno } from "../models/desempeno.js";

export const desempenoRepository = {
    async findAll() {
        return Desempeno.findAll({
            where: { activo: true },
            order: [['orden', 'ASC']]
        });
    }
};