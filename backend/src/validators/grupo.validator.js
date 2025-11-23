import { body, param } from "express-validator";
import { Sede } from "../models/sede.js";
import { Docente } from "../models/docente.js";
import {
    verificarExistenciaPorCampo,
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
} from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

export const validarCrearGrupo = [
    validarCampoRequerido("nombre", "Ingrese el nombre del grupo.")
        .isLength({ max: 10 }).withMessage("El nombre del grupo no debe exceder los 10 caracteres."),

    validarCampoRequerido("grado", "Ingrese el grado del grupo.")
        .isLength({ max: 20 }).withMessage("El nombre del grado no debe exceder los 20 caracteres."),

    validarCampoRequerido("jornada", "Indique la jornada del grupo.")
        .isLength({ max: 30 }).withMessage("La jornada no debe exceder los 30 caracteres."),

    validarCampoRequerido("sedeId", "Seleccione la sede donde pertenece el grupo.")
        .isInt({ min: 1 }).withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorCampo(Sede, "id", "la sede", "ID")),

    body("directorId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Docente, "id", "el docente", "ID")),

    validationErrorHandler,
];

export const validarActualizarGrupo = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El identificador del grupo no es válido."),

    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre del grupo si desea actualizarlo.")
        .isLength({ max: 10 }).withMessage("El nombre del grupo no debe exceder los 10 caracteres."),

    validarCampoOpcionalRequerido("grado", "Ingrese el grado si desea actualizarlo.")
        .isLength({ max: 20 }).withMessage("El nombre del grado no debe exceder los 20 caracteres."),

    validarCampoOpcionalRequerido("jornada", "Indique la jornada si desea actualizarla.")
        .isLength({ max: 30 }).withMessage("La jornada no debe exceder los 30 caracteres."),

    body("directorId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Docente, "id", "el docente", "ID")),

    validationErrorHandler,
];

export const validarGrupoExistente = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El identificador del grupo no es válido."),
    validationErrorHandler,
];