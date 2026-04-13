import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { planillaController } from "../controllers/planilla.controller.js";

const router = express.Router();

/**
 * Rutas: Planillas PDF
 * Endpoint base: /api/planillas
 */

// Generar planilla PDF (Asistencia, Seguimiento, Calificaciones, Comportamiento)
router.get(
    "/pdf",
    protect,
    restrictTo(["docente", "admin", "secretaria", "coordinador", "director"]),
    planillaController.descargarPlanillaPdf
);

export default router;