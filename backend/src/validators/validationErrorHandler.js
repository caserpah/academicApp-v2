import { validationResult } from "express-validator";
import { sendError } from "../middleware/responseHandler.js";

/**
 * 🧩 Middleware: validationErrorHandler
 * -------------------------------------
 * Maneja los errores de validación provenientes de express-validator
 * y devuelve una respuesta JSON uniforme.
 *
 * Estructura de respuesta:
 * {
 *   "status": "error",
 *   "message": "Error de validación de campos.",
 *   "errors": [
 *     { "field": "nombre", "message": "El nombre es requerido." },
 *     { "field": "email", "message": "Formato de correo inválido." }
 *   ],
 *   "timestamp": "2025-11-08T10:45:30.123Z"
 * }
 */

export const validationErrorHandler = (req, res, next) => {
    const errors = validationResult(req);

    // Si no hay errores, pasa al siguiente middleware
    if (errors.isEmpty()) return next();

    // Formatear los errores: captura solo el primer mensaje por campo
    const formattedErrors = errors.array({ onlyFirstError: true }).map((err) => ({
        field: err.param,
        message: err.msg,
    }));

    // Devuelve respuesta estandarizada
    return sendError(
        res,
        "Error de validación de campos.",
        422,
        formattedErrors
    );
};