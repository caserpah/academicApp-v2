import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { vigenciaContext } from "../middleware/vigenciaContext.js";
import { listadoController } from "../controllers/listado.controller.js";

const router = express.Router();

/**
 * Rutas: Generación de Listados PDF
 * Endpoint base: /api/listados
 */

// Obtener el catálogo de sedes, grados y grupos para los filtros
router.get(
    "/filtros",
    protect,
    restrictTo(["admin", "secretaria", "coordinador", "rector"]),
    vigenciaContext,
    listadoController.obtenerFiltros
);

// Generar PDF: Listado masivo de Estudiantes (Rango)
router.get(
    "/estudiantes",
    protect,
    restrictTo(["admin", "secretaria", "coordinador", "rector"]),
    vigenciaContext,
    listadoController.descargarEstudiantes
);

// Generar PDF: Directores de Grupo
router.get(
    "/directores",
    protect,
    restrictTo(["admin", "secretaria", "coordinador", "rector"]),
    vigenciaContext,
    listadoController.descargarDirectores
);

// Generar PDF: Docentes
router.get(
    "/docentes",
    protect,
    restrictTo(["admin", "secretaria", "coordinador", "rector"]),
    vigenciaContext,
    listadoController.descargarDocentes
);

// Generar PDF: Áreas y Asignaturas
router.get(
    "/areas",
    protect,
    restrictTo(["admin", "secretaria", "coordinador", "rector"]),
    vigenciaContext,
    listadoController.descargarAreas
);

export default router;