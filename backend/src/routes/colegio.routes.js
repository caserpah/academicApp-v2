import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import {
    validarCrearColegio,
    validarActualizarColegio,
} from '../validators/colegio.validator.js';
import { colegioController } from "../controllers/colegio.controller.js";

const router = express.Router();

/**
 * ============================================================
 * RUTAS: COLEGIOS
 * ------------------------------------------------------------
 * Controla la gestión de instituciones educativas (colegios).
 * Solo los administradores pueden crear, actualizar o eliminar.
 * ============================================================
 */

// Listar todos los colegios
router.get("/", protect, colegioController.list);

// Obtener colegio por ID
router.get("/:id", protect, colegioController.get);

// Registrar nuevo colegio (solo admin)
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    validarCrearColegio,
    validationErrorHandler,
    colegioController.create
);

// Actualizar colegio (solo admin)
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarColegio,
    validationErrorHandler,
    colegioController.update
);

// Eliminar colegio (solo admin)
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    colegioController.remove
);

export default router;