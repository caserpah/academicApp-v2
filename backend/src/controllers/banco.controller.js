import { BancoRecomendacion } from "../models/banco_recomendacion.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const bancoController = {
    async listar(req, res, next) {
        try {
            const recomendaciones = await BancoRecomendacion.findAll({
                where: { activo: true },
                attributes: ['id', 'categoria', 'descripcion', 'tipo', 'activo'],
                order: [['categoria', 'ASC'], ['descripcion', 'ASC']]
            });
            return sendSuccess(res, recomendaciones);
        } catch (error) {
            next(error);
        }
    }
};