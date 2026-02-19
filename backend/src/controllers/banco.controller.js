import { BancoRecomendacion } from "../models/banco_recomendacion.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const bancoController = {
    async listar(req, res, next) {
        try {
            const recomendaciones = await BancoRecomendacion.findAll({
                where: { activo: true },
                order: [['titulo', 'ASC']]
            });
            return sendSuccess(res, recomendaciones);
        } catch (error) {
            next(error);
        }
    }
};