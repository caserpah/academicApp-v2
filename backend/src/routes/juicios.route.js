import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";

import {
    ValidarCrearJuicio,
    validarActualizarJuicio,
} from "../validators/juicio.validator.js";

import { juicioController } from "../controllers/juicio.controller.js";

const router = express.Router();

/**
 * Rutas: Juicios
 * Endpoint base: /juicios
 */

// Listar juicios
router.get("/", protect, juicioController.list);

// Obtener juicio por ID
router.get("/:id", protect, juicioController.get);

// Crear juicio
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    ValidarCrearJuicio,
    validationErrorHandler,
    juicioController.create
);

// Actualizar juicio
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarJuicio,
    validationErrorHandler,
    juicioController.update
);

// Eliminar juicio
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    juicioController.remove
);

export default router;