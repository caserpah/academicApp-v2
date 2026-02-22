import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import { uploadEvidence } from "../middleware/uploadEvidence.js"

import {
    ValidarGuardarCalificacion
} from "../validators/calificacion.validator.js";

import { calificacionController } from "../controllers/calificacion.controller.js";

const router = express.Router();

/**
 * Rutas: Calificaciones
 * Endpoint base: /calificaciones
 */

// Listar grilla de calificaciones de un grupo
router.get(
    "/grupo",
    protect,
    restrictTo(["docente", "admin", "secretaria","coordinador"]),
    calificacionController.getPorGrupo
);

// Guardar o Actualizar calificación (Upsert)
router.post(
    "/",
    protect,
    restrictTo(["docente", "secretaria", "admin"]),
    uploadEvidence,  // Multer procesa el archivo antes de llegar al controlador
    ValidarGuardarCalificacion,
    validationErrorHandler,
    calificacionController.guardar
);

export default router;