import { validationResult } from "express-validator";
import { sendError } from "../middleware/responseHandler.js";

/**
 * 🧩 Middleware: validationErrorHandler
 * -------------------------------------
 * Maneja los errores de validación provenientes de express-validator
 * y devuelve una respuesta JSON uniforme marcada como advertencia (warning).
 */
export const validationErrorHandler = (req, res, next) => {
    const errors = validationResult(req);

    // Si no hay errores, pasa al siguiente middleware
    if (errors.isEmpty()) return next();

    // Formatear los errores: captura solo el primer mensaje por campo
    const formattedErrors = errors.array({ onlyFirstError: true }).map((err) => ({
        field: err.path || err.param,
        message: err.msg,
    }));

    const primerMensaje = formattedErrors[0]?.message || "Verifique los datos proporcionados.";

    // Devuelve respuesta estandarizada como advertencia de validación
    return sendError(
        res,
        primerMensaje,
        422,
        formattedErrors,
        null,
        {
            alertType: "warning",
            title: "Datos incompletos o inválidos.",
        }
    );
};