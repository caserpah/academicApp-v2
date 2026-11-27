/**
 * Helper para extraer mensajes de error detallados de la API
 * preservando metadatos de severidad (alertType, title).
 */
export const parseError = (error, defaultMessage = "Ocurrió un error inesperado.") => {
    const apiError = error.response?.data;

    let message = defaultMessage;

    if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        const firstError = apiError.errors[0];
        // Cubre si viene como { message: '...' }, { msg: '...' } o un string directo
        message = firstError.message || firstError.msg || firstError;
    } else {
        message = apiError?.message || error.message || defaultMessage;
    }

    const parsed = new Error(message);
    parsed.alertType = apiError?.alertType || error?.alertType || "error";
    parsed.title = apiError?.title || error?.title || null;

    return parsed;
};