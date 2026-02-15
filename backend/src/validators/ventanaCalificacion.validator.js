import { body, param } from "express-validator";
import { VentanaCalificacion } from "../models/ventana_calificacion.js";
import { Vigencia } from "../models/vigencia.js";
import { validarCampoRequerido, verificarExistenciaPorId } from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

export const validarCrearVentana = [
    validarCampoRequerido("periodo", "El periodo es obligatorio.")
        .isInt({ min: 1, max: 4 }).withMessage("El periodo debe estar entre 1 y 4."),

    validarCampoRequerido("fechaInicio", "La fecha de inicio es obligatoria.")
        .isISO8601().withMessage("Formato de fecha de inicio no válido (YYYY-MM-DD)."),

    validarCampoRequerido("fechaFin", "La fecha de cierre es obligatoria.")
        .isISO8601().withMessage("Formato de fecha de cierre no válido (YYYY-MM-DD)."),

    body("vigenciaId").optional().isInt().custom(verificarExistenciaPorId(Vigencia, "id", "la vigencia")),

    body("habilitada").optional().isBoolean(),
    body("descripcion").optional().isString().isLength({ max: 150 }),

    validationErrorHandler
];

export const validarActualizarVentana = [
    param("id").isInt().custom(verificarExistenciaPorId(VentanaCalificacion, "id", "la ventana")),
    // Los campos son opcionales en update pero deben ser válidos si vienen
    body("periodo").optional().isInt({ min: 1, max: 4 }),
    body("fechaInicio").optional().isISO8601(),
    body("fechaFin").optional().isISO8601(),
    validationErrorHandler
];