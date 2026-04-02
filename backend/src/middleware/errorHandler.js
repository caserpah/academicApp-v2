import { handleSequelizeError } from "./handleSequelizeError.js";
import { sendError } from "./responseHandler.js"

/**
 * 🌐 Middleware global de manejo centralizado de errores.
 * -------------------------------------------------------
 * Intercepta cualquier error propagado por `next(error)` en los controladores
 * y devuelve una respuesta JSON uniforme.
 */

export const errorHandler = (err, req, res, next) => {
    const env = process.env.NODE_ENV || "development";
    const errorId = Date.now();

    // Muestra el Log detallado solo en entorno de desarrollo
    //if (env !== "production") {
        console.error(`🧨 Error [${errorId}] capturado por errorHandler:`, err);
    //}

    // Delegar manejo de errores de Sequelize
    if (
        err.name?.startsWith("Sequelize") ||
        ["UniqueConstraintError", "ValidationError", "ForeignKeyConstraintError"].includes(err.name)
    ) {
        err = handleSequelizeError(err);
    }

    // Errores de Express-validator (normalmente gestionados por validationErrorHandler)
    if (err.errors && Array.isArray(err.errors)) {
        const errors = err.errors.map((e) => ({
            field: e.field || e.param,
            message: e.message || e.msg,
        }));

        return sendError(res, err.message || "Error de validación de campos.", 422, errors, errorId);
    }

    // Errores personalizados con status y mensaje definidos
    if (err.status && err.message) {
        return sendError(res, err.message, err.status, err.errors || null, errorId);
    }

    // Errores de recursos no encontrados (control manual)
    if (err.status === 404) {
        return sendError(res, err.message || "Recurso no encontrado.", 404, null, errorId);
    }

    // Errores personalizados lanzados desde hooks de Sequelize en los modelos
    if (err.message && !err.status && err.name === "Error") {
        return res.status(400).json({
            status: "error",
            message: err.message,
        });
    }

    // Errores genéricos no controlados
    return sendError(
        res,
        "Error interno del servidor. Por favor, inténtelo más tarde.",
        500,
        null,
        errorId
    );
};