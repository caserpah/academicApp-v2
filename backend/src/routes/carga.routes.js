import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";

import {
    validarCrearCarga,
    validarActualizarCarga
} from "../validators/carga.validator.js";

import { cargaController } from "../controllers/carga.controller.js";

const router = express.Router();

/**
 * Rutas: Cargas Académicas
 * Endpoint base: /cargas
 */

/** Listar */
router.get("/", protect, cargaController.list);

/** Listar mis cargas (Docente logueado) */
router.get("/mis-cargas", protect, cargaController.listMisCargas);

/** Obtener por ID */
router.get("/:id", protect, cargaController.get);

/** Crear */
router.post(
    "/",
    protect,
    restrictTo(["admin", "coordinador"]),
    validarCrearCarga,
    validationErrorHandler,
    cargaController.create
);

/** Actualizar */
router.put(
    "/:id",
    protect,
    restrictTo(["admin", "coordinador"]),
    validarActualizarCarga,
    validationErrorHandler,
    cargaController.update
);

/** Eliminar */
router.delete(
    "/:id",
    protect,
    restrictTo(["admin", "coordinador"]),
    cargaController.remove
);

export default router;