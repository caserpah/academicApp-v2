import express from "express";
import multer from "multer";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import { uploadEvidence } from "../middleware/uploadEvidence.js";

import {
    ValidarObtenerPendientes,
    ValidarRegistrarNivelacion,
    ValidarGenerarConsolidados
} from "../validators/nivelacion.validator.js";

import { nivelacionController } from "../controllers/nivelacion.controller.js";

// Usamos memoryStorage para tener acceso al buffer en el controlador
const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

/**
 * Rutas: Nivelaciones
 * Endpoint base: /nivelaciones
 */

// Listar estudiantes que reprobaron y necesitan nivelación
router.get(
    "/pendientes",
    protect,
    restrictTo(["docente", "admin", "secretaria", "coordinador"]),
    ValidarObtenerPendientes,
    validationErrorHandler,
    nivelacionController.obtenerParaNivelar
);

// Registrar nota de nivelación y evidencia (Upsert/Update)
router.put(
    "/:matriculaId/:asignaturaId",
    protect,
    restrictTo(["docente", "admin", "secretaria"]),
    uploadEvidence, // Multer procesa el FormData y el archivo luego lo deja en req.file
    ValidarRegistrarNivelacion,
    validationErrorHandler,
    nivelacionController.registrar
);

/**
 * PROCESO ADMINISTRATIVO: Cierre de Año (Generar Consolidados)
 * POST /api/nivelaciones/generar-consolidados
 */
router.post(
    "/generar-consolidados",
    protect,
    restrictTo(["admin", "coordinador", "secretaria"]),
    ValidarGenerarConsolidados,
    validationErrorHandler,
    nivelacionController.generarConsolidados
);

export default router;