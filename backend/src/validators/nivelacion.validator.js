import { body, param, query } from "express-validator";
import { validarCampoRequerido, verificarExistenciaPorId } from "../utils/dbUtils.js";
import { Matricula } from "../models/matricula.js";
import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Sede } from "../models/sede.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

/**
 * Validador para obtener los estudiantes pendientes por nivelar
 */
export const ValidarObtenerPendientes = [
    query("grupoId")
        .notEmpty().withMessage("El grupo es requerido en la consulta.")
        .isInt().withMessage("El grupo seleccionado no es válido.")
        .toInt(),

    validationErrorHandler,
];

/**
 * Validador para registrar una nota de nivelación
 */
export const ValidarRegistrarNivelacion = [
    param("matriculaId")
        .isInt().withMessage("La matrícula seleccionada no es válida.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Matricula, "id", "la matrícula")),

    // --- Cuerpo de la petición (req.body parseado por multer) ---
    body("notaNivelacion")
        .notEmpty().withMessage("La nota de nivelación es requerida.")
        .isFloat({ min: 1.0, max: 3.0 })
        .withMessage("La nota de nivelación debe estar entre 1.0 y 3.0")
        .toFloat(),

    body("observacion_nivelacion")
        .optional({ nullable: true, checkFalsy: true })
        .isString().withMessage("La observación debe ser un texto.")
        .isLength({ max: 500 }).withMessage("La observación no puede exceder los 500 caracteres."),

    validationErrorHandler,
];

/**
 * Validador para el disparador del Generador de Consolidados (Cierre de Año)
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

    validationErrorHandler,
];