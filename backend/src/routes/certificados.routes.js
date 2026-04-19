import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { certificadoController } from "../controllers/certificado.controller.js";

const router = express.Router();

/**
 * Rutas: Certificados y Constancias
 * Endpoint base: /api/certificados
 */

// Buscar estudiante por documento y traer su historial de matrículas
router.get(
    "/buscar-estudiante/:busqueda",
    protect,
    restrictTo(["admin", "secretaria", "coordinador", "rector"]),
    certificadoController.buscarEstudiante
);

// Generar y descargar Constancia de Matrícula (PDF)
router.get(
    "/matricula",
    protect,
    restrictTo(["admin", "secretaria", "coordinador", "rector"]),
    certificadoController.descargarCertificadoMatricula
);

// Generar y descargar Certificado de Notas (PDF)
router.get(
    "/notas",
    protect,
    restrictTo(["admin", "secretaria", "coordinador", "rector"]),
    certificadoController.descargarCertificadoNotas
);

export default router;