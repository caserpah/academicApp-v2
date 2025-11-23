import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import {
    validarCrearAsignatura,
    validarActualizarAsignatura,
} from "../validators/asignatura.validator.js";
import { asignaturaController } from "../controllers/asignatura.controller.js";

const router = express.Router();

/**
 * Rutas: Asignatura (por vigencia)
 * Endpoint base: /asignaturas
 */

// Listar asignaturas
router.get("/", protect, asignaturaController.list);

// Obtener asignatura por ID
router.get("/:id", protect, asignaturaController.get);

// Crea asignatura
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    validarCrearAsignatura,
    validationErrorHandler,
    asignaturaController.create
);

// Actualizar asignatura
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarAsignatura,
    validationErrorHandler,
    asignaturaController.update
);

// Eliminar asignatura
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    asignaturaController.remove
);

export default router;