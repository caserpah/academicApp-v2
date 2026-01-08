import { gradoService } from "../services/grado.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const gradoController = {
    async list(req, res, next) {
        try {
            const data = await gradoService.list();
            return sendSuccess(res, data, "Lista de grados obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    }
};