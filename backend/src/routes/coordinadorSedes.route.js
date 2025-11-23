import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import {
    validarCrearCoordinadorSede,
    validarActualizarCoordinadorSede,
} from "../validators/coordinadorSedes.validator.js";
import { coordinadorSedesController } from "../controllers/coordinadorSedes.controller.js";

const router = express.Router();

/**
 * Rutas: Asignación Coordinadores ↔ Sedes (por vigencia)
 * Endpoint base: /coordinadores-sedes
 */

// Listar asignaciones
router.get("/", protect, coordinadorSedesController.list);

// Obtener asignación por ID
router.get("/:id", protect, coordinadorSedesController.get);

// Crear asignación (solo admin)
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    validarCrearCoordinadorSede,
    validationErrorHandler,
    coordinadorSedesController.create
);

// Actualizar asignación (solo jornada)
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarCoordinadorSede,
    validationErrorHandler,
    coordinadorSedesController.update
);

// Eliminar asignación
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    coordinadorSedesController.remove
);

export default router;