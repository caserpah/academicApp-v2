import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import {
    validarCrearCoordinador,
    validarActualizarCoordinador,
} from "../validators/coordinador.validator.js";
import { coordinadorController } from "../controllers/coordinador.controller.js";

const router = express.Router();

/**
 * Rutas: Coordinadores
 */

// Listar coordinadores
router.get("/", protect, coordinadorController.list);

// Obtener coordinador por ID
router.get("/:id", protect, coordinadorController.get);

// Crear coordinador (solo admin)
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    validarCrearCoordinador,
    validationErrorHandler,
    coordinadorController.create
);

// Actualizar coordinador (solo admin)
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarCoordinador,
    validationErrorHandler,
    coordinadorController.update
);

// Eliminar coordinador (solo admin)
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    coordinadorController.remove
);

export default router;