/**
 * 🟢 Utilidades de respuesta HTTP unificada
 * -----------------------------------------
 * Define funciones estándar para enviar respuestas JSON consistentes.
 * Se integra naturalmente con los middlewares `errorHandler` y `handleSequelizeError`.
 */

/**
 * Envía una respuesta exitosa
 * @param {Response} res - Objeto de respuesta de Express
 * @param {*} data - Datos a devolver (puede ser objeto, array, null)
 * @param {string} [message="Operación exitosa"] - Mensaje opcional
 * @param {number} [statusCode=200] - Código HTTP
 */
export const sendSuccess = (res, data = null, message = "Operación exitosa", statusCode = 200) => {
    return res.status(statusCode).json({
        status: "success",
        message,
        data,
        timestamp: new Date().toISOString(),
    });
};

export const sendError = (
    res,
    message = "Error interno del servidor",
    statusCode = 500,
    errors = null,
    errorId = null,
    options = {}
) => {
    const { alertType = "error", title = null } = options;

    const response = {
        status: alertType === "error" ? "error" : alertType, // Mantiene compatibilidad y comunica el tipo
        alertType, // 'error' | 'warning' | 'info'
        message,
        timestamp: new Date().toISOString(),
    };

    if (title) response.title = title;
    if (errors) response.errors = errors;
    if (errorId) response.errorId = errorId;

    return res.status(statusCode).json(response);
};