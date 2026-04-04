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

// ==========================================
// RUTAS DE REPORTES PDF (ESTÁTICAS)
// ==========================================

// Descargar Acta de Matrícula en Blanco
router.get(
    "/formato/blanco",
    protect,
    restrictTo(["admin", "secretaria"]),
    matriculaController.descargarPdfBlanco
);

// Descargar Actas de Matrícula por Lote (Grupo)
// Recibe por query string: ?grupoId=123
router.get(
    "/lote/pdf",
    protect,
    restrictTo(["admin", "secretaria"]),
    matriculaController.descargarPdfLote
);

// ==========================================
// RUTAS PRINCIPALES CRUD Y DINÁMICAS
// ==========================================

// Listar matrículas
router.get(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    //validarListar,
    matriculaController.listar
);

// Descargar Acta de Matrícula Individual
router.get(
    "/:id/pdf",
    protect,
    restrictTo(["admin", "secretaria"]),
    matriculaController.descargarPdfActa
);

// Obtener matrícula por ID
router.get(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    matriculaController.obtenerPorId
);

// Crear matrícula individual
router.post(
    "/",
    protect,
    restrictTo(["admin", "secretaria"]),
    validarCrearMatricula,
    matriculaController.crear
);

// Actualizar matrícula (Traslados, Retiros)
router.put(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    validarActualizarMatricula,
    matriculaController.actualizar
);

// Eliminar matrícula
router.delete(
    "/:id",
    protect,
    restrictTo(["admin", "secretaria"]),
    matriculaController.eliminar
);

// Crear Matrícula / Promoción Masiva
router.post(
    "/masivo",
    protect,
    restrictTo(["admin", "secretaria"]),
    validarMasivo,
    matriculaController.crearMasivo
);

export default router;