import { body, param, query } from "express-validator";
import { validarCampoRequerido, verificarExistenciaPorId } from "../utils/dbUtils.js";
import { Matricula } from "../models/matricula.js";
import { Asignatura } from "../models/asignatura.js";
import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Sede } from "../models/sede.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

/**
 * Validador para obtener los estudiantes pendientes por nivelar
 * Query params: ?grupoId=X&asignaturaId=Y
 */
export const ValidarObtenerPendientes = [
    query("grupoId")
        .notEmpty().withMessage("El grupo es requerido en la consulta.")
        .isInt().withMessage("El grupo seleccionado no es válido.")
        .toInt(),

    query("asignaturaId")
        .notEmpty().withMessage("La asignatura es requerida en la consulta.")
        .isInt().withMessage("La asignatura seleccionada no es válida.")
        .toInt(),

    // Middleware final de manejo de errores
    validationErrorHandler,
];

/**
 * Validador para registrar una nota de nivelación
 * Params: /:matriculaId/:asignaturaId
 * Body: formData (notaNivelacion, observacion_nivelacion)
 */
export const ValidarRegistrarNivelacion = [
    // --- Parámetros de la URL ---
    param("matriculaId")
        .isInt().withMessage("La matrícula seleccionada no es válida.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Matricula, "id", "la matrícula")),

    param("asignaturaId")
        .isInt().withMessage("La asignatura seleccionada no es válida.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura")),

    // --- Cuerpo de la petición (req.body parseado por multer) ---
    body("notaNivelacion")
        .notEmpty().withMessage("La nota de nivelación es requerida.")
        .isFloat({ min: 1.0, max: 5.0 })
        .withMessage("La nota de nivelación debe estar entre 1.0 y 5.0")
        .toFloat(),

    body("observacion_nivelacion")
        .optional({ nullable: true, checkFalsy: true })
        .isString().withMessage("La observación debe ser un texto.")
        .isLength({ max: 500 }).withMessage("La observación no puede exceder los 500 caracteres."),

    // Middleware final de manejo de errores
    validationErrorHandler,
];

/**
 * Validador para el disparador del Generador de Consolidados (Cierre de Año)
 * Body esperado: { sedeId, gradoId, grupoId }
 */
export const ValidarGenerarConsolidados = [
    body("sedeId")
        .notEmpty().withMessage("Seleccione la sede.")
        .isInt().withMessage("La sede seleccionada no es válida.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Sede, "id", "la sede")),

    body("gradoId")
        .notEmpty().withMessage("Seleccione el grado.")
        .isInt().withMessage("El grado seleccionado no es válido.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado")),

    body("grupoId")
        .notEmpty().withMessage("Seleccione el grupo.")
        .isInt().withMessage("El grupo seleccionado no es válido.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Grupo, "id", "el grupo")),

    // Middleware final de manejo de errores
    validationErrorHandler,
];