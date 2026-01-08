import { Dimension } from "../models/dimension.js";

export const dimensionRepository = {
    async findAll() {
        return Dimension.findAll({
            where: { activo: true }
        });
    }
};