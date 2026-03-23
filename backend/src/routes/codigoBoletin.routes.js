import express from "express";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { vigenciaContext } from "../middleware/vigenciaContext.js";
import { codigoBoletinController } from "../controllers/codigoBoletin.controller.js";

const router = express.Router();

/**
 * Rutas: Códigos de Boletines (Descarga Pública y Auditoría)
 * Endpoint base: /codigos-boletines
 */

// =========================================================
// RUTA PÚBLICA (SIN MIDDLEWARES DE AUTH)
// =========================================================
// El acudiente digita el código en la web y descarga el PDF
router.get("/publico/:codigo", codigoBoletinController.descargarPublico);

// =========================================================
// RUTAS PROTEGIDAS (ADMINISTRATIVAS)
// =========================================================
// Aplicamos la cadena de seguridad para todo lo que sigue
router.use(protect);
router.use(restrictTo(["admin", "secretaria", "coordinador", "rector"]));
router.use(vigenciaContext); // Aseguramos el contexto del año lectivo actual

// Listar todos los códigos generados de un salón específico
router.get("/grupo/:grupoId/periodo/:periodo", codigoBoletinController.listarPorGrupo);

// Botón de pánico: Bloquear o desbloquear la descarga de un código (Mora/Cartera)
router.patch(
    "/:id/estado",
    codigoBoletinController.alternarEstado
);

export default router;