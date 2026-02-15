import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { ventanaCalificacionController } from "../controllers/ventanaCalificacion.controller.js";
import {
    validarCrearVentana,
    validarActualizarVentana
} from "../validators/ventanaCalificacion.validator.js";

const router = express.Router();

/**
 * ============================================================
 * RUTAS: VENTANA DE CALIFICACIÓN
 * ------------------------------------------------------------
 * Gestiona las ventanas de calificación para cada periodo.
 * Solo los administradores y coordinadores pueden crear, actualizar o eliminar.
 * ============================================================
 */

router.use(protect); // Todas las rutas requieren login

router.get("/", ventanaCalificacionController.list);
router.get("/:id", ventanaCalificacionController.get);

// Solo admin y coordinadores pueden modificar ventanas
router.post("/", restrictTo(["admin", "secretaria", "coordinador"]), validarCrearVentana, ventanaCalificacionController.create);
router.put("/:id", restrictTo(["admin", "secretaria", "coordinador"]), validarActualizarVentana, ventanaCalificacionController.update);
router.delete("/:id", restrictTo(["admin", "secretaria", "coordinador"]), ventanaCalificacionController.remove);

export default router;