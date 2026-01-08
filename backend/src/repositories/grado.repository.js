import { Grado } from "../models/grado.js";

export const gradoRepository = {
    async findAll() {
        return Grado.findAll({
            where: { activo: true },
            order: [['orden', 'ASC']]
        });
    }
};