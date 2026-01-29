import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";
import {
    validarCrearVigencia,
    validarActualizarVigencia,
} from "../validators/vigencia.validator.js";
import { vigenciaController } from "../controllers/vigencia.controller.js";

const router = express.Router();

/**
 * 🌐 Rutas: Vigencias
 * -------------------
 * Define los endpoints para gestionar los años lectivos.
 * Reglas:
 *  - Solo usuarios autenticados pueden consultar.
 *  - Solo administradores pueden crear, editar, eliminar o activar vigencias.
 */

// 🔹 Listar todas las vigencias
router.get("/", protect, vigenciaController.list);

// 🔹 Obtener detalle de una vigencia específica
router.get("/:id", protect, vigenciaController.get);

// 🔹 Crear nueva vigencia (solo admin)
router.post(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    validarCrearVigencia,
    validationErrorHandler,
    vigenciaController.create
);

// 🔹 Actualizar vigencia (solo admin)
router.put(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    validarActualizarVigencia,
    validationErrorHandler,
    vigenciaController.update
);

// 🔹 Eliminar vigencia (solo admin)
router.delete(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    vigenciaController.remove
);

// 🔹 Abrir una vigencia específica (solo admin)
router.post(
    "/:id/abrir",
    protect,
    restrictTo(["admin", "secretaria"]),
    vigenciaController.abrir
);

// 🔹 Cerrar una vigencia específica (solo admin)
router.post(
    "/:id/cerrar",
    protect,
    restrictTo(["admin", "secretaria"]),
    vigenciaController.cerrar
);

export default router;