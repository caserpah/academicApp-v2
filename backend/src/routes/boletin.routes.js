import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { vigenciaContext } from "../middleware/vigenciaContext.js";
import { boletinController } from "../controllers/boletin.controller.js";
import { ValidarGenerarBoletinesLote } from "../validators/boletin.validator.js";

const router = express.Router();

/**
 * Rutas: Boletines
 * Endpoint base: /boletines
 * * Middleware Sequence:
 * 1. protect (Auth token)
 * 2. restrictTo (Roles)
 * 3. vigenciaContext (Contexto año lectivo) -> Necesario para cruzar calificaciones de ese año
 * 4. validator (Validación campos)
 * 5. controller (Lógica)
 */

// Generar lote de boletines por grupo
router.post(
    "/generar-lote",
    protect,
    restrictTo(["admin", "secretaria", "coordinador"]),
    vigenciaContext,
    ValidarGenerarBoletinesLote,
    boletinController.generarLote
);

// Auditoría de notas pendientes antes de imprimir boletines
router.get(
    "/auditoria",
    protect,
    restrictTo(["admin", "secretaria", "coordinador"]),
    vigenciaContext,
    boletinController.auditarNotasPendientes
);

export default router;