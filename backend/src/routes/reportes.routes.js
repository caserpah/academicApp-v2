import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { reporteController } from "../controllers/reporte.controller.js";

const router = express.Router();

/**
 * Rutas: Reportes y Sábanas PDF
 * Endpoint base: /api/reportes
 */

router.get(
    "/sabanas/pdf",
    protect,
    restrictTo(["docente", "admin", "secretaria", "coordinador", "director"]),
    reporteController.descargarSabanaPdf
);

export default router;