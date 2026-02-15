import jwt from "jsonwebtoken";
import { sendError } from "./responseHandler.js";

/**
 * 🛡️ Middleware: protect
 * -----------------------
 * Verifica la validez del JWT y adjunta el usuario decodificado a `req.user`.
 */
export const protect = (req, res, next) => {
    let token;

    // 1. Extraer token del encabezado Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1]; // Formato: "Bearer <token>" -> extraemos solo el token
    }

    // 2. Si no hay token → acceso denegado
    if (!token) {
        return sendError(res, "Acceso denegado. No se encontró token.", 401);
    }

    try {
        // 3. Verificar y decodificar el token usando la clave secreta
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Adjuntar la información del usuario decodificada a la solicitud
        // Esto permite acceder al ID y al rol en los controladores (ej. req.user.id)
        req.user = decoded;

        // 5. Continuar con el siguiente middleware/controlador
        next();

    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return sendError(res, "Token expirado. Por favor, inicia sesión nuevamente.", 401);
        }
        if (err.name === "JsonWebTokenError") {
            return sendError(res, "Token inválido. Acceso denegado.", 401);
        }

        console.error("❌ Error en verificación JWT:", err);
        return sendError(res, "Error al verificar el token.", 500);
    }
};

/**
 * 🧩 Middleware: restrictTo
 * --------------------------
 * Restringe el acceso a rutas específicas según roles permitidos.
 * Ejemplo: restrictTo(["admin", "docente"])
 */
export const restrictTo = (roles = []) => {
    return (req, res, next) => {
        // req.user.role viene adjunto por el middleware 'protect'
        if (!req.user || !roles.includes(req.user.role)) {
            return sendError(res, "No tiene permiso para realizar esta acción.", 403);
        }
        next();
    };
};