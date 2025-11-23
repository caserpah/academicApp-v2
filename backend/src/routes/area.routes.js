import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import {
    validarCrearArea,
    validarActualizarArea
} from "../validators/area.validator.js";
import { areaController } from "../controllers/area.controller.js";

const router = express.Router();

/**
 * Rutas: Áreas (por vigencia)
 * Endpoint base: /areas
 */

// Listar áreas
router.get("/", protect, areaController.list);

// Obtener área por ID
router.get("/:id", protect, areaController.get);

// Crear área
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    validarCrearArea,
    validationErrorHandler,
    areaController.create
);

// Actualizar área
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarArea,
    validationErrorHandler,
    areaController.update
);

// Eliminar área
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    areaController.remove
);

export default router;