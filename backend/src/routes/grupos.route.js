import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";

import {
    validarCrearGrupo,
    validarActualizarGrupo
} from "../validators/grupo.validator.js";

import { grupoController } from "../controllers/grupo.controller.js";

const router = express.Router();

/**
 * Rutas: Grupos
 * Endpoint base: /grupos
 */

/** Listar grupos (todos los roles autenticados) */
router.get("/", protect, grupoController.list);

/** Obtener grupo por ID (todos los roles autenticados) */
router.get("/:id", protect, grupoController.get);

/** Crear grupo (solo admin) */
router.post(
    "/",
    protect,
    restrictTo(["admin"]),
    validarCrearGrupo,
    validationErrorHandler,
    grupoController.create
);

/** Actualizar grupo (solo admin) */
router.put(
    "/:id",
    protect,
    restrictTo(["admin"]),
    validarActualizarGrupo,
    validationErrorHandler,
    grupoController.update
);

/** Eliminar grupo (solo admin) */
router.delete(
    "/:id",
    protect,
    restrictTo(["admin"]),
    grupoController.remove
);

export default router;