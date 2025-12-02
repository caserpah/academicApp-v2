import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import {
    validarCrearRango,
    validarActualizarRango,
} from "../validators/desempenoRango.validator.js";
import { desempenoRangoController } from "../controllers/desempenoRango.controller.js";

const router = express.Router();

/**
 * Rutas: Rangos de Desempeño
 * Endpoint base: /desempenos/rangos
 */

// Listar rangos de desempeño
router.get("/", protect, restrictTo(["admin"]), desempenoRangoController.list);

// Obtener rango de desempeño por ID
router.get("/:id", protect, restrictTo(["admin"]), desempenoRangoController.get);

// Crear rango de desempeño
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    validarCrearRango,
    validationErrorHandler,
    desempenoRangoController.create
);

//Actualizar rango de desempeño
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarRango,
    validationErrorHandler,
    desempenoRangoController.update
);

// Eliminar rango de desempeño
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    desempenoRangoController.remove
);

export default router;