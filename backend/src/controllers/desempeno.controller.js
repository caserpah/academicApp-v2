import { desempenoService } from "../services/desempeno.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const desempenoController = {
    async list(req, res, next) {
        try {
            const data = await desempenoService.list();
            return sendSuccess(res, data, "Lista de desempeños obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    }
};