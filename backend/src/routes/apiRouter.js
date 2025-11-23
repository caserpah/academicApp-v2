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
import autenticacionRoutes from "../routes/autenticacion.route.js"
//import usuarioRoutes from "./usuarios.route.js";

router.use("/auth", autenticacionRoutes);
//router.use("/usuarios", usuarioRoutes);

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
//import docenteRoutes from "./docentes.route.js";
import coordinadorRoutes from './coordinadores.route.js';
/*import acudienteRoutes from "./acudientes.route.js";
import estudianteRoutes from "./estudiantes.route.js";

router.use("/docentes", docenteRoutes);*/
router.use('/coordinadores', coordinadorRoutes);
/*router.use("/acudientes", acudienteRoutes);
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
/*import grupoRoutes from "./grupos.route.js";
import cargaRoutes from "./cargas.route.js";
import calificacionRoutes from "./calificaciones.route.js";*/
import juicioRoutes from "./juicios.route.js";
//import matriculaRoutes from "./matriculas.route.js";

router.use("/vigencias-config", vigenciaConfigRoutes); // Configuración de vigencias
/*router.use("/grupos", vigenciaContext, grupoRoutes);
router.use("/cargas", vigenciaContext, cargaRoutes);
router.use("/calificaciones", vigenciaContext, calificacionRoutes);*/
router.use("/juicios", vigenciaContext, juicioRoutes);
//router.use("/matriculas", vigenciaContext, matriculaRoutes);

/* ============================================================
    🧭 EXPORTACIÓN DEL ENRUTADOR PRINCIPAL
   ============================================================ */
export default router;