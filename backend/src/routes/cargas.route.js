import express from "express";
import { CargaController } from "../controllers/carga.controller.js";
import {
    validarCrearCarga,
    validarActualizarCarga,
    validarCargaExistente,
} from "../validators/carga.validator.js";
import { protect, restrictTo } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 🔐 Protección global para todas las rutas
router.use(protect);

/**
 * ============================================================
 * Rutas: Cargas Académicas
 * Prefijo: /cargas (definido en apiRouter.js)
 * Vigencia automática vía middleware global
 * ============================================================
 */

// Crear / Listar
router
    .route("/")
    .post(restrictTo("admin"), validarCrearCarga, CargaController.crear)
    .get(restrictTo("admin", "director", "coordinador"), CargaController.listar);

// Obtener / Actualizar / Eliminar
router
    .route("/:id")
    .get(restrictTo("admin", "director", "coordinador"), validarCargaExistente, CargaController.obtenerPorId)
    .put(restrictTo("admin"), validarActualizarCarga, CargaController.actualizar)
    .delete(restrictTo("admin"), validarCargaExistente, CargaController.eliminar);

export default router;