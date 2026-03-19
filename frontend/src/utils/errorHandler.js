/**
 * Helper para extraer mensajes de error detallados de la API
 */
export const parseError = (error, defaultMessage = "Ocurrió un error inesperado.") => {
    const apiError = error.response?.data;

    if (apiError?.errors && Array.isArray(apiError.errors) && apiError.errors.length > 0) {
        const firstError = apiError.errors[0];
        // Cubre si viene como { message: '...' }, { msg: '...' } o un string directo
        return new Error(firstError.message || firstError.msg || firstError);
    }

    return new Error(apiError?.message || error.message || defaultMessage);
};