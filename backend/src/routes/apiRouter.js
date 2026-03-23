/**
 * ============================================================
 * RUTAS PRINCIPALES DEL SISTEMA ACADÉMICO ESCOLAR
 * ------------------------------------------------------------
 * Este archivo centraliza todas las rutas del backend,
 * agrupadas por dominio funcional:
 *  - Institucional (colegio, sedes, coordinadores)
 *  - Académico (vigencias, áreas, asignaturas, grupos, cargas)
 *  - Estudiantes (estudiantes, acudientes, matrículas, calificaciones)
 *  - Sistema (usuarios, autenticación)
 * ============================================================
 */

import express from "express";
import { vigenciaContext } from "../middleware/vigenciaContext.js";

const router = express.Router();

/* ============================================================
    🔐 AUTENTICACIÓN Y USUARIOS
   ============================================================ */
import authRoutes from "../routes/auth.routes.js"
import usuarioRoutes from "./usuarios.routes.js";

router.use("/auth", authRoutes);
router.use("/usuarios", usuarioRoutes);

/* ============================================================
    🏫 INSTITUCIÓN EDUCATIVA
   ============================================================ */
import colegioRoutes from "./colegio.routes.js";
import sedeRoutes from "./sedes.route.js";
import vigenciaRoutes from "./vigencia.routes.js";
import areaRoutes from './area.routes.js';
import asignaturaRoutes from './asignaturas.route.js';
import indicadorRoutes from './indicadores.route.js';

router.use("/colegios", colegioRoutes);
router.use("/sedes", sedeRoutes);
router.use("/vigencias", vigenciaRoutes);
router.use("/areas", vigenciaContext, areaRoutes);
router.use("/asignaturas", vigenciaContext, asignaturaRoutes);
router.use("/indicadores", vigenciaContext, indicadorRoutes);

/* ============================================================
    👩‍🏫 PERSONAL Y ESTUDIANTES
   ============================================================ */
import docenteRoutes from "./docentes.route.js";
import coordinadorRoutes from './coordinadores.route.js';
import acudienteRoutes from "./acudiente.routes.js";
import estudianteRoutes from "./estudiantes.route.js";

router.use("/docentes", docenteRoutes);
router.use('/coordinadores', coordinadorRoutes);
router.use("/acudientes", acudienteRoutes);
router.use("/estudiantes", estudianteRoutes);

/* ============================================================
    🔗 RELACIONES ENTRE PERSONAS Y SEDES
   ============================================================ */
import coordinadorSedesRoutes from "./coordinadorSedes.route.js";
//import acudienteEstudiantesRoutes from "./acudienteEstudiantes.route.js";

router.use("/coordinadores-sedes", vigenciaContext, coordinadorSedesRoutes);
//router.use("/acudientes-estudiantes", acudienteEstudiantesRoutes);


/* ============================================================
    📘 GESTIÓN ACADÉMICA
   ============================================================ */
import vigenciaConfigRoutes from "./vigenciaConfig.route.js";
import grupoRoutes from "./grupos.route.js";
import cargaRoutes from "./carga.routes.js";
import calificacionRoutes from "./calificacion.routes.js";
import ventanaCalificacionRoutes from "./ventanaCalificacion.routes.js";
import nivelacionRoutes from "./nivelacion.routes.js";
import boletinRoutes from "./boletin.routes.js";
import juicioRoutes from "./juicios.route.js";
import matriculaRoutes from "./matriculas.route.js";
import gradoRoutes from "./grado.routes.js";
import dimensionRoutes from "./dimension.routes.js";
import desempenoRoutes from "./desempeno.routes.js";
import desempenoRangoRoutes from "./desempenoRango.routes.js";
import recomendacionRoutes from "./banco.routes.js";
import codigoBoletinRoutes from "./codigoBoletin.routes.js";

router.use("/vigencias-config", vigenciaConfigRoutes); // Configuración de vigencias
router.use("/grupos", vigenciaContext, grupoRoutes);
router.use("/cargas", vigenciaContext, cargaRoutes);
router.use("/calificaciones", vigenciaContext, calificacionRoutes);
router.use("/ventanas-calificacion", ventanaCalificacionRoutes);
router.use("/nivelaciones", vigenciaContext, nivelacionRoutes);
router.use("/boletines", boletinRoutes);
router.use("/juicios", vigenciaContext, juicioRoutes);
router.use("/matriculas", vigenciaContext, matriculaRoutes);
router.use("/grados", gradoRoutes);
router.use("/dimensiones", dimensionRoutes);
router.use("/desempenos", desempenoRoutes);
router.use("/desempenos/rangos", vigenciaContext, desempenoRangoRoutes);
router.use("/recomendaciones", recomendacionRoutes)
router.use("/codigos-boletines", codigoBoletinRoutes);

/* ============================================================
    🧭 EXPORTACIÓN DEL ENRUTADOR PRINCIPAL
   ============================================================ */
export default router;