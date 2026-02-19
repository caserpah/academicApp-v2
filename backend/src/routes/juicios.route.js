import express from "express";
import multer from "multer";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { validationErrorHandler } from "../validators/validationErrorHandler.js";

import {
    ValidarCrearJuicio,
    validarActualizarJuicio,
} from "../validators/juicio.validator.js";

import { juicioController } from "../controllers/juicio.controller.js";

// Usamos memoryStorage para tener acceso al buffer en el controlador
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

// Descargar plantilla vacía para importación masiva
router.get(
    "/plantilla/descargar",
    protect,
    restrictTo(["admin"]),
    juicioController.descargarPlantilla
);

// Importar Masivo (Todo en uno)
// Nota: 'archivo' debe coincidir con el formData del frontend
router.post(
    "/importar",
    protect,
    restrictTo(["admin"]),
    upload.single("archivo"), // Middleware de multer para manejar la subida del archivo
    juicioController.importar
);

export default router;