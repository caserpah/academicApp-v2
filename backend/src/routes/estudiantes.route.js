import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";

import {
    ValidarCrearEstudiante,
    ValidarActualizarEstudiante
} from "../validators/estudiante.validator.js";

import { estudianteController } from "../controllers/estudiante.controller.js";

const router = express.Router();

/**
 * Rutas: Estudiantes
 * Endpoint base: /estudiantes
 */

// Listar estudiantes con filtros
router.get("/", protect, estudianteController.list);

// Obtener estudiante por ID
router.get("/:id", protect, estudianteController.get);

// Crear estudiante
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    ValidarCrearEstudiante,
    validationErrorHandler,
    estudianteController.create
);

// Actualizar estudiante
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    ValidarActualizarEstudiante,
    validationErrorHandler,
    estudianteController.update
);

// Eliminar estudiante
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    estudianteController.remove
);

export default router;