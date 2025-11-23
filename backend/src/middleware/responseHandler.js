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

/**
 * Envía una respuesta de error controlado
 * @param {Response} res - Objeto de respuesta de Express
 * @param {string} [message="Error interno del servidor"] - Mensaje de error
 * @param {number} [statusCode=500] - Código HTTP
 * @param {Array|Object|null} [errors=null] - Detalle de errores opcional
 * @param {string|number} [errorId=null] - Identificador del error (para trazabilidad)
 */
export const sendError = (
    res,
    message = "Error interno del servidor",
    statusCode = 500,
    errors = null,
    errorId = null
) => {
    const response = {
        status: "error",
        message,
        timestamp: new Date().toISOString(),
    };

    if (errors) response.errors = errors;
    if (errorId) response.errorId = errorId;

    return res.status(statusCode).json(response);
};