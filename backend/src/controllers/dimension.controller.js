import { dimensionService } from "../services/dimension.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const dimensionController = {
    async list(req, res, next) {
        try {
            const data = await dimensionService.list();
            return sendSuccess(res, data, "Lista de dimensiones obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    }
};