import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { certificadoController } from "../controllers/certificado.controller.js";
import {
    ValidarBuscarEstudiante,
    ValidarCertificadoMatriculaIndividual,
    ValidarCertificadoNotasIndividual,
    ValidarCertificadoMatriculaMasivo,
    ValidarCertificadoNotasMasivo
} from "../validators/certificado.validator.js";

const router = express.Router();

const ROLES_PERMITIDOS = ["admin", "secretaria", "coordinador", "rector"];

/**
 * Rutas: Certificados y Constancias
 * Endpoint base: /api/certificados
 */

// Buscar estudiante por documento y traer su historial de matrículas
router.get(
    "/buscar-estudiante/:busqueda",
    protect,
    restrictTo(ROLES_PERMITIDOS),
    ValidarBuscarEstudiante,
    certificadoController.buscarEstudiante
);

// Generar y descargar Constancia de Matrícula (PDF)
router.get(
    "/matricula",
    protect,
    restrictTo(ROLES_PERMITIDOS),
    ValidarCertificadoMatriculaIndividual,
    certificadoController.descargarCertificadoMatricula
);

// Generar y descargar Constancias de Matrícula Masivas por Grupo (PDF)
router.get(
    "/matricula/masivo",
    protect,
    restrictTo(ROLES_PERMITIDOS),
    ValidarCertificadoMatriculaMasivo,
    certificadoController.descargarCertificadosMatriculaMasivo
);

// Generar y descargar Certificado de Notas (PDF)
router.get(
    "/notas",
    protect,
    restrictTo(ROLES_PERMITIDOS),
    ValidarCertificadoNotasIndividual,
    certificadoController.descargarCertificadoNotas
);

// Generar y descargar Certificados de Notas Masivos por Grupo (PDF)
router.get(
    "/notas/masivo",
    protect,
    restrictTo(ROLES_PERMITIDOS),
    ValidarCertificadoNotasMasivo,
    certificadoController.descargarCertificadosNotasMasivo
);

export default router;