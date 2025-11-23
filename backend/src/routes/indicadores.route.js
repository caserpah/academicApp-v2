import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import {
    validarCrearIndicador,
    validarActualizarIndicador
} from "../validators/indicador.validator.js";
import { indicadorController } from "../controllers/indicador.controller.js";

const router = express.Router();

/**
 * Rutas: Indicadores
 * Endpoint base: /indicadores
 */

// Listar indicadores
router.get("/", protect, indicadorController.list);

// Obtener indicador por ID
router.get("/:id", protect, indicadorController.get);

// Crear indicador
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    validarCrearIndicador,
    validationErrorHandler,
    indicadorController.create
);

//Actualizar indicador
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarIndicador,
    validationErrorHandler,
    indicadorController.update
);

// Eliminar indicador
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    indicadorController.remove
);

export default router;