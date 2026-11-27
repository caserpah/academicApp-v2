import { handleSequelizeError } from "./handleSequelizeError.js";
import { sendError } from "./responseHandler.js";

/**
 * 🌐 Middleware global de manejo centralizado de errores.
 * -------------------------------------------------------
 * Intercepta cualquier error propagado por `next(error)` en los controladores
 * y devuelve una respuesta JSON uniforme.
 */
export const errorHandler = (err, req, res, next) => {
    const env = process.env.NODE_ENV || "development";
    const errorId = Date.now();

    // Delegar manejo de errores de Sequelize
    if (
        err.name?.startsWith("Sequelize") ||
        ["UniqueConstraintError", "ValidationError", "ForeignKeyConstraintError"].includes(err.name)
    ) {
        err = handleSequelizeError(err);
    }

    // Inferir severidad: códigos 4xx son advertencias de negocio si no traen otro alertType explícito
    const statusCode = err.status || 500;
    const alertType =
        err.alertType ||
        (statusCode >= 400 && statusCode < 500 ? "warning" : "error");

    // Log detallado en desarrollo solo si es error técnico real
    if (env !== "production" && alertType === "error") {
        console.error(`🧨 Error [${errorId}] capturado por errorHandler:`, err);
    }

    // Errores de Express-validator (normalmente gestionados por validationErrorHandler)
    if (err.errors && Array.isArray(err.errors)) {
        const errors = err.errors.map((e) => ({
            field: e.field || e.param,
            message: e.message || e.msg,
        }));

        return sendError(res, err.message || "Verifique los datos proporcionados.", 422, errors, errorId, {
            alertType: "warning",
            title: err.title || "Datos incompletos o inválidos",
        });
    }

    // Errores personalizados con status y mensaje definidos (incluye BusinessWarning, BusinessInfo y new Error con status)
    if (err.status && err.message) {
        const defaultTitle =
            alertType === "info"
                ? "Información"
                : alertType === "warning"
                ? "Atención"
                : "Error del servidor";

        return sendError(res, err.message, err.status, err.errors || null, errorId, {
            alertType,
            title: err.title || defaultTitle,
        });
    }

    // Errores personalizados lanzados desde hooks de Sequelize en los modelos
    if (err.message && !err.status && err.name === "Error") {
        return sendError(res, err.message, 400, null, errorId, {
            alertType: "warning",
            title: "Validación",
        });
    }

    // Errores genéricos no controlados
    return sendError(
        res,
        "Ocurrió un inconveniente interno en el servidor. Por favor, intenta nuevamente en unos momentos.",
        500,
        null,
        errorId,
        { alertType: "error", title: "Error del servidor" }
    );
};