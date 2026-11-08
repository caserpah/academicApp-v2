import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { ValidarConfirmarPromocion } from "../validators/promocion.validator.js";
import { promocionController } from "../controllers/promocion.controller.js";

const router = express.Router();

/**
 * Rutas: Promoción Académica
 * Endpoint base: /promocion
 */

// Endpoint para obtener la propuesta de promoción (simulación)
router.post(
    "/simulador",
    protect,
    restrictTo(["admin", "coordinador"]),
    promocionController.simularMasiva
);

// Ejecutar motor de promoción masiva para un grupo
router.post(
    "/ejecutar",
    protect,
    restrictTo(["admin", "coordinador", "secretaria"]),
    ValidarConfirmarPromocion,
    promocionController.ejecutarMasiva
);

// Endpoint para verificar si un grupo tiene estudiantes activos
router.get(
    "/verificar-matriculas",
    protect,
    restrictTo(["admin", "coordinador", "secretaria"]),
    promocionController.verificarActivos
);

export default router;