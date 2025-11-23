import Swal from "sweetalert2";

/**
 * Notificación genérica.
 * @param {string} title - Título del mensaje.
 * @param {string|Array} message - Texto o lista de mensajes HTML.
 * @param {"success"|"error"|"warning"|"info"|"question"} [icon="info"] - Tipo de ícono.
 * @param {object} [options={}] - Configuración adicional (confirmación, botones, etc.)
 * @returns {Promise<SweetAlertResult>} - Devuelve la promesa del Swal.fire() (útil para confirmaciones)
 */
export const showNotification = async (title, message, icon = "info", options = {}) => {
    // Soporte para listas de errores o texto plano
    const html = Array.isArray(message)
        ? `<ul style="list-style:none !important; padding:0; margin:0; text-align:left;">${message
            .map((msg) => `<li>${msg}</li>`)
            .join("")}</ul>`
        : message;

    const swalConfig = {
        icon,
        title,
        html,
        confirmButtonColor: "#4f46e5",
        confirmButtonText: options.confirmButtonText || "Aceptar",
        showCloseButton: true,
        allowOutsideClick: false,
        ...options,
    };

    const result = await Swal.fire(swalConfig);
    return result;
};

/**
 * ✅ Alerta de éxito
 */
export const showSuccess = (message, title = "Éxito") =>
    showNotification(title, message, "success");

/**
 * ❌ Alerta de error
 */
export const showError = (message, title = "Error") =>
    showNotification(title, message, "error");

/**
 * ⚠️ Alerta de advertencia simple (sin botones de confirmación)
 */
export const showWarning = (message, title = "Advertencia") =>
    showNotification(title, message, "warning");

/**
 * ❓ Diálogo de confirmación (para eliminar o acciones críticas)
 * Retorna una promesa con `result.isConfirmed`
 */
export const showConfirm = async (message, title = "¿Está seguro?") => {
    const result = await showNotification(title, message, "warning", {
        showCancelButton: true,
        confirmButtonText: "Sí, continuar",
        cancelButtonText: "Cancelar",
    });
    return result.isConfirmed;
};