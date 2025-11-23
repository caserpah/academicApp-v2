import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { vigenciaConfigController } from "../controllers/vigenciaConfig.controller.js";

const router = express.Router();

/**
 * Copiar configuración académica entre vigencias.
 * Body:
 * {
 *   "origenId": 1,
 *   "destinoId": 2,
 *   "areas": true,
 *   "asignaturas": true,
 *   "indicadores": true,
 *   "juicios": true
 * }
 */
router.post(
    "/copiar",
    protect,
    restrictTo(["admin"]),
    vigenciaConfigController.copiarConfiguracion
);

export default router;