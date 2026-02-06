import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { vigenciaContext } from "../middleware/vigenciaContext.js";
import { matriculaController } from "../controllers/matricula.controller.js";
import {
    validarCrearMatricula,
    validarActualizarMatricula,
    validarListar,
    validarMasivo
} from "../validators/matricula.validator.js";

const router = express.Router();

/**
 * Rutas: Matrículas
 * Endpoint base: /matriculas
 * * Middleware Sequence:
 * 1. protect (Auth token)
 * 2. restrictTo (Roles)
 * 3. vigenciaContext (Contexto año lectivo) -> Necesario para lógica de folios y cupos
 * 4. validator (Validación campos)
 * 5. controller (Lógica)
 */

// Listar matrículas
router.get(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    vigenciaContext,
    //validarListar,
    matriculaController.listar
);

// Obtener matrícula por ID
router.get(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    vigenciaContext,
    matriculaController.obtenerPorId
);

// Crear matrícula individual
router.post(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    vigenciaContext,
    validarCrearMatricula,
    matriculaController.crear
);

// Actualizar matrícula (Traslados, Retiros)
router.put(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    vigenciaContext,
    validarActualizarMatricula,
    matriculaController.actualizar
);

// Eliminar matrícula
router.delete(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    vigenciaContext,
    matriculaController.eliminar
);

// Crear Matrícula / Promoción Masiva
router.post(
    "/masivo",
    protect,
    restrictTo(["admin", "secretaria"]),
    vigenciaContext,
    validarMasivo,
    matriculaController.crearMasivo
);

export default router;