import express from "express";
import multer from "multer";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";

import {
    ValidarCrearJuicio,
    validarActualizarJuicio,
} from "../validators/juicio.validator.js";

import { juicioController } from "../controllers/juicio.controller.js";

const upload = multer({ storage: multer.memoryStorage() });
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

// Descargar plantilla de importación
router.get(
    "/plantilla",
    protect,
    restrictTo(["admin"]),
    juicioController.descargarPlantilla
);

// Importar juicios desde archivo Excel
router.post(
    "/importar",
    protect,
    restrictTo(["admin"]),
    upload.single("archivo"),
    juicioController.importar
);

export default router;