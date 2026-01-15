import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";

import {
    ValidarCrearDocente,
    ValidarActualizarDocente
} from "../validators/docente.validator.js";

import { docenteController } from "../controllers/docente.controller.js";

const router = express.Router();

/**
 * Rutas: Docentes
 * Endpoint base: /docentes
 */


/** Listar docentes */
router.get("/", protect, docenteController.list);

/** Obtener docente por ID */
router.get("/:id", protect, docenteController.get);


/** Crear docente (solo admin) */
router.post(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    ValidarCrearDocente,
    validationErrorHandler,
    docenteController.create
);


/** Actualizar docente (solo admin) */
router.put(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    ValidarActualizarDocente,
    validationErrorHandler,
    docenteController.update
);


/** Eliminar docente (solo admin) */
router.delete(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    docenteController.remove
);

export default router;