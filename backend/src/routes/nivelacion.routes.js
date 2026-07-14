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
    "/:matriculaId/:areaId",
    protect,
    restrictTo(["docente", "admin", "secretaria"]),
    uploadEvidence,
    ValidarRegistrarNivelacion,
    validationErrorHandler,
    nivelacionController.registrar
);

/**
 * PROCESO ADMINISTRATIVO: Cierre de Año (Generar Consolidados)
 */
router.post(
    "/generar-consolidados",
    protect,
    restrictTo(["admin", "coordinador", "secretaria"]),
    ValidarGenerarConsolidados,
    validationErrorHandler,
    nivelacionController.generarConsolidados
);

router.get(
    "/verificar-consolidados",
    protect,
    restrictTo(["admin", "coordinador", "secretaria"]),
    nivelacionController.verificarConsolidados
);

router.get(
    "/reprobados-directos",
    protect,
    restrictTo(["docente", "admin", "secretaria", "coordinador"]),
    nivelacionController.obtenerReprobadosDirectos
);

router.post(
    "/completar-notas-faltantes",
    protect,
    restrictTo(["admin", "coordinador", "secretaria"]),
    nivelacionController.completarNotasFaltantes
);

router.get(
    "/acta-pdf",
    protect,
    restrictTo(["docente", "admin", "secretaria", "coordinador"]),
    nivelacionController.descargarActaPdf
);

export default router;