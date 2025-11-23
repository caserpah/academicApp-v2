import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import {
    validarCrearSede,
    validarActualizarSede,
} from "../validators/sede.validator.js";
import { sedeController } from "../controllers/sede.controller.js";

const router = express.Router();

/**
 * ============================================================
 * RUTAS: SEDES
 * ------------------------------------------------------------
 * Gestiona las sedes del colegio.
 * Solo los administradores pueden crear, actualizar o eliminar.
 * ============================================================
 */

// Listar sedes
router.get("/", protect, sedeController.list);

// Obtener sede por ID
router.get("/:id", protect, sedeController.get);

// Crear sede (solo admin)
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    validarCrearSede,
    validationErrorHandler,
    sedeController.create
);

// Actualizar sede (solo admin)
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarSede,
    validationErrorHandler,
    sedeController.update
);

// Eliminar sede (solo admin)
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    sedeController.remove
);

export default router;