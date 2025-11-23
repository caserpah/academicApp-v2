import { Vigencia } from "../models/vigencia.js";

/**
 * 📅 Obtiene la vigencia académica (año lectivo) activa.
 * Lanza un error 409 si no existe ninguna activa.
 */
export async function getVigenciaActiva() {
    const vigente = await Vigencia.findOne({ where: { activa: true } });
    if (!vigente) {
        const error = new Error("No hay un año lectivo vigente configurado.");
        error.status = 409; // Conflict
        throw error;
    }
    return vigente;
}

/**
 * 🔄 Cambia la vigencia activa, asegurando que solo una quede activa.
 * Lanza error 404 si el ID no corresponde a una vigencia existente.
 * @param {number} id - ID de la vigencia a activar
 */
export async function setVigenciaActiva(id) {
    const vigente = await Vigencia.findByPk(id);
    if (!vigente) {
        const error = new Error(`No se encontró el año lectivo con ID ${id}.`);
        error.status = 404;
        throw error;
    }

    // Desactiva todas las vigencias
    await Vigencia.update({ activa: false }, { where: {} });

    // Activa la seleccionada
    await vigente.update({ activa: true });

    return vigente;
}

/**
 * 🧭 Obtiene la vigencia inyectada en el request (por vigenciaContext).
 * Lanza error 400 si no se encuentra.
 */
export function getVigenciaFromRequest(req) {
    if (!req.vigenciaActual) {
        const error = new Error("No se ha establecido el año lectivo en la solicitud.");
        error.status = 400; // Bad Request
        throw error;
    }
    return req.vigenciaActual;
}