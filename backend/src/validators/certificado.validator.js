import { param, query } from "express-validator";
import { verificarExistenciaPorId } from "../utils/dbUtils.js";
import { Matricula } from "../models/matricula.js";
import { Grupo } from "../models/grupo.js";
import { Vigencia } from "../models/vigencia.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

/**
 * Validador para la búsqueda general de estudiantes
 */
export const ValidarBuscarEstudiante = [
    param("busqueda")
        .trim()
        .notEmpty().withMessage("Debe proporcionar un término de búsqueda.")
        .isLength({ min: 2, max: 100 }).withMessage("El término de búsqueda debe tener entre 2 y 100 caracteres."),

    validationErrorHandler,
];

/**
 * Validador para descarga individual de Constancia de Matrícula
 */
export const ValidarCertificadoMatriculaIndividual = [
    query("matriculaId")
        .notEmpty().withMessage("Debe proporcionar el ID de la matrícula.")
        .isInt({ min: 1 }).withMessage("La matrícula seleccionada no es válida.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Matricula, "id", "la matrícula")),

    query("iniciaronClases")
        .optional()
        .isBoolean().withMessage("El indicador de inicio de clases debe ser booleano.")
        .toBoolean(),

    query("meses")
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1, max: 12 }).withMessage("La cantidad de meses debe estar entre 1 y 12.")
        .toInt(),

    query("comportamiento")
        .optional({ nullable: true, checkFalsy: true })
        .isString().withMessage("El comportamiento debe ser un texto válido.")
        .isLength({ max: 50 }).withMessage("El comportamiento no puede exceder los 50 caracteres."),

    validationErrorHandler,
];

/**
 * Validador para descarga individual de Certificado de Estudios (Notas)
 */
export const ValidarCertificadoNotasIndividual = [
    query("matriculaId")
        .notEmpty().withMessage("Debe proporcionar el ID de la matrícula.")
        .isInt({ min: 1 }).withMessage("La matrícula seleccionada no es válida.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Matricula, "id", "la matrícula")),

    query("periodo")
        .notEmpty().withMessage("Debe seleccionar un periodo para generar el certificado.")
        .isInt({ min: 1, max: 5 }).withMessage("El periodo seleccionado no es válido.")
        .toInt(),

    validationErrorHandler,
];

/**
 * Validador para descarga masiva de Constancias de Matrícula por grupo
 */
export const ValidarCertificadoMatriculaMasivo = [
    query("grupoId")
        .notEmpty().withMessage("Debe seleccionar un grupo.")
        .isInt({ min: 1 }).withMessage("El grupo seleccionado no es válido.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Grupo, "id", "el grupo")),

    query("vigenciaId")
        .notEmpty().withMessage("Debe seleccionar una vigencia.")
        .isInt({ min: 1 }).withMessage("La vigencia seleccionada no es válida.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Vigencia, "id", "la vigencia")),

    query("iniciaronClases")
        .optional()
        .isBoolean().withMessage("El indicador de inicio de clases debe ser booleano.")
        .toBoolean(),

    query("meses")
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1, max: 12 }).withMessage("La cantidad de meses debe estar entre 1 y 12.")
        .toInt(),

    query("comportamiento")
        .optional({ nullable: true, checkFalsy: true })
        .isString().withMessage("El comportamiento debe ser un texto válido.")
        .isLength({ max: 50 }).withMessage("El comportamiento no puede exceder los 50 caracteres."),

    validationErrorHandler,
];

/**
 * Validador para descarga masiva de Certificados de Estudios (Notas) por grupo
 */
export const ValidarCertificadoNotasMasivo = [
    query("grupoId")
        .notEmpty().withMessage("Debe seleccionar un grupo.")
        .isInt({ min: 1 }).withMessage("El grupo seleccionado no es válido.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Grupo, "id", "el grupo")),

    query("vigenciaId")
        .notEmpty().withMessage("Debe seleccionar una vigencia.")
        .isInt({ min: 1 }).withMessage("La vigencia seleccionada no es válida.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Vigencia, "id", "la vigencia")),

    query("periodo")
        .notEmpty().withMessage("Debe seleccionar un periodo para generar los certificados.")
        .isInt({ min: 1, max: 5 }).withMessage("El periodo seleccionado no es válido.")
        .toInt(),

    validationErrorHandler,
];