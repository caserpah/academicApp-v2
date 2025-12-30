import { Router } from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

import {
    ValidarCrearEstudiante,
    ValidarActualizarEstudiante
} from "../validators/estudiante.validator.js";

import { estudianteController } from "../controllers/estudiante.controller.js";

const router = Router();

/**
 * Rutas: Estudiantes
 * Endpoint base: /estudiantes
 */

// Listar estudiantes con filtros
router.get(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    estudianteController.list
);

// Obtener estudiante por ID
router.get(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    estudianteController.get
);

// Crear estudiante
router.post(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    ValidarCrearEstudiante,
    estudianteController.create
);

// Actualizar estudiante
router.put(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    ValidarActualizarEstudiante,
    estudianteController.update
);

// Eliminar estudiante
router.delete(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    estudianteController.remove
);

// Asignar acudiente a estudiante
router.post(
    "/:id/acudientes",
    protect,
    restrictTo(["admin", "secretaria"]),
    estudianteController.addAcudiente
);

// Remover acudiente de estudiante
router.delete(
    "/:id/acudientes/:acudienteId",
    protect,
    restrictTo(["admin", "secretaria"]),
    estudianteController.removeAcudiente
);

export default router;