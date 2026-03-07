import express from "express";
import multer from "multer";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import { uploadEvidence } from "../middleware/uploadEvidence.js"

import {
    ValidarGuardarCalificacion
} from "../validators/calificacion.validator.js";

import { calificacionController } from "../controllers/calificacion.controller.js";

// Usamos memoryStorage para tener acceso al buffer en el controlador
const upload = multer({ storage: multer.memoryStorage() });

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

// Descargar plantilla vacía para importación masiva
router.get(
    "/plantilla/descargar",
    protect,
    restrictTo(["docente", "secretaria", "admin"]),
    calificacionController.descargarPlantilla
);

// Importar Masivo (Todo en uno)
// Nota: 'archivo' debe coincidir con el formData del frontend
router.post(
    "/importar",
    protect,
    restrictTo(["docente", "secretaria", "admin"]),
    upload.single("archivo"), // Middleware de multer para manejar la subida del archivo
    calificacionController.importar
);

// Alerta de pendientes (Check ligero para la alerta visual)
router.get(
    "/pendientes/check",
    protect,
    restrictTo(["docente", "admin", "coordinador"]),
    calificacionController.checkPendientes
);

/*
// Reporte detallado de pendientes (para el modal)
router.get(
    "/pendientes/reporte",
    protect,
    restrictTo(["docente", "admin", "coordinador"]),
    calificacionController.descargarReportePendientes
);*/

export default router;