import { Vigencia } from "../models/vigencia.js";

/**
 * Middleware: vigenciaContext
 * -------------------------------------------
 * Comportamiento:
 *
 * ✔ Si el cliente envía x-vigencia-id:
 *       - Si existe → se usa esa vigencia
 *       - Si NO existe → 404 con mensaje claro
 *
 * ✔ Si NO envía x-vigencia-id:
 *       - Si existe vigencia activa → se usa la activa
 *       - Si NO existe → 409 "Debe seleccionar/activar un año lectivo"
 *
 * Este middleware nunca debe bloquear listados vacíos
 * (la ausencia de registros se maneja en los services).
 */
export async function vigenciaContext(req, res, next) {
    try {
        const headerId = req.headers["x-vigencia-id"];
        let vigente = null;

        // Si el cliente envía vigencia explícita en el header
        if (headerId) {
            vigente = await Vigencia.findByPk(headerId);

            if (!vigente) {
                return res.status(404).json({
                    status: "error",
                    message: `El año lectivo indicado no existe.`,
                });
            }

            req.vigenciaActual = vigente;
            return next();
        }

        // Si NO envía header: usar la vigencia activa
        vigente = await Vigencia.findOne({ where: { activa: true } });

        if (!vigente) {
            return res.status(409).json({
                status: "error",
                message:
                    "No hay un año lectivo activo. Active o seleccione uno para continuar.",
            });
        }

        req.vigenciaActual = vigente;
        next();

    } catch (error) {
        console.error("Error en vigenciaContext:", error);

        return res.status(500).json({
            status: "error",
            message: "Hubo un problema al determinar el año lectivo. Inténtelo más tarde."
        });
    }
}