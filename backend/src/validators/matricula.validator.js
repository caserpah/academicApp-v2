import { body, param, query } from "express-validator";
import { validationErrorHandler } from "./validationErrorHandler.js";
import { Estudiante } from "../models/estudiante.js";
import { Grupo } from "../models/grupo.js";
import { Sede } from "../models/sede.js";
import { Matricula } from "../models/matricula.js";
import {
    validarCampoRequerido,
    validarFechaNoFutura,
    verificarExistenciaPorId,
    verificarReglasEdicionMatricula,
} from "../utils/dbUtils.js";

const METODOLOGIAS_VALIDAS = ["TRADICIONAL", "ETNOEDUCACION", "ESCUELA_NUEVA", "ACELERACION_APRENDIZAJE"];

export const validarCrearMatricula = [
    validarCampoRequerido("estudianteId", "Seleccione un estudiante.")
        .isInt({ min: 1 }).withMessage("El estudiante seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Estudiante, "id", "el estudiante")),

    validarCampoRequerido("gradoId", "El grado es obligatorio.")
        .isInt({ min: 1 }).withMessage("El grado seleccionado no es válido."),

    validarCampoRequerido("grupoId", "Seleccione un grupo.")
        .isInt({ min: 1 }).withMessage("El grupo seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grupo, "id", "el grupo")),

    validarCampoRequerido("sedeId", "Seleccione una sede.")
        .isInt({ min: 1 }).withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Sede, "id", "la sede")),

    body("estado")
        .optional()
        .isIn(["PREMATRICULADO", "ACTIVA"])
        .withMessage("Al crear una matrícula, el estado solo puede ser PREMATRICULADO o ACTIVA."),

    validarCampoRequerido("metodologia", "Seleccione una metodología.")
        .isIn(METODOLOGIAS_VALIDAS)
        .withMessage("La metodología seleccionada no es válida."),

    body("observaciones")
        .optional()
        .isLength({ max: 500 }).withMessage("Las observaciones no deben exceder 500 caracteres"),

    validationErrorHandler
];

export const validarActualizarMatricula = [
    param("id")
        .isInt().withMessage("La matrícula seleccionada no es válida.")
        .bail()
        .custom(verificarReglasEdicionMatricula(Matricula)),

    body("vigenciaId")
        .optional()
        .isInt()
        .custom((value, { req }) => {
            if (value && Number(value) !== Number(req.matriculaActual.vigenciaId)) {
                throw new Error("No está permitido cambiar el año lectivo de una matrícula existente. Debe anularla y crear una nueva.");
            }
            return true;
        }),

    body("gradoId")
        .optional()
        .isInt()
        .custom((value, { req }) => {
            if (value && Number(value) !== Number(req.matriculaActual.gradoId)) {
                throw new Error("No está permitido cambiar el grado de una matrícula existente. Debe anularla y crear una nueva.");
            }
            return true;
        }),

    body("grupoId")
        .optional()
        .isInt()
        .custom(verificarExistenciaPorId(Grupo, "id", "el grupo")),

    body("sedeId")
        .optional()
        .isInt()
        .custom(verificarExistenciaPorId(Sede, "id", "la sede")),

    body("estado")
        .optional()
        .isIn(["PREMATRICULADO", "ACTIVA", "RETIRADO", "DESERTADO", "ANULADO"])
        .withMessage("El estado seleccionado no es válido para la edición. Son exclusivos de la promoción y no pueden ser asignados manualmente."),

    body("metodologia")
        .optional()
        .isIn(METODOLOGIAS_VALIDAS)
        .withMessage("La metodología seleccionada no es válida"),

    body("observaciones")
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage("Las observaciones no pueden exceder 500 caracteres"),

    body("motivoRetiro")
        .optional({ nullable: true })
        .trim()
        .isLength({ max: 200 }).withMessage("El motivo de retiro no puede exceder 200 caracteres"),

    validationErrorHandler
];

export const validarMasivo = [
    body("estudiantesIds")
        .isArray({ min: 1 }).withMessage("No se puede procesar la solicitud. Es necesario seleccionar al menos un estudiante para completar esta acción.")
        .custom((ids) => {
            if (!ids.every(id => Number.isInteger(id))) {
                throw new Error("Error en la selección. Los datos de los estudiantes no son válidos; por favor, intente seleccionarlos nuevamente.");
            }
            return true;
        }),

    body("grupoDestinoId")
        .notEmpty().withMessage("Seleccione el grupo de destino.")
        .custom(verificarExistenciaPorId(Grupo, "id", "el grupo destino")),

    body("sedeId")
        .notEmpty().withMessage("Seleccione una sede.")
        .custom(verificarExistenciaPorId(Sede, "id", "la sede")),

    validationErrorHandler
];

export const validarListar = [
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("sedeId").optional().isInt(),
    query("grupoId").optional().isInt(),
    query("gradoId").optional().isInt(),
    query("vigenciaId").optional().isInt(),
    validationErrorHandler
];