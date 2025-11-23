import { body, param } from "express-validator";
import { Sede } from "../models/sede.js";
import { Docente } from "../models/docente.js";
import { Grupo } from "../models/grupo.js";
import { Asignatura } from "../models/asignatura.js";
import {
    verificarExistenciaPorCampo,
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
} from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

export const validarCrearCarga = [
    validarCampoRequerido("codigo", "Ingrese el código de la carga.")
        .isLength({ max: 10 }).withMessage("El código no debe exceder los 10 caracteres."),

    validarCampoRequerido("horas", "Ingrese el número de horas asignadas.")
        .isInt({ min: 1, max: 40 }).withMessage("Las horas deben estar entre 1 y 40."),

    validarCampoRequerido("sedeId", "Seleccione la sede donde se imparte la carga.")
        .isInt({ min: 1 }).withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorCampo(Sede, "id", "la sede", "ID")),

    validarCampoRequerido("docenteId", "Seleccione el docente asignado.")
        .isInt({ min: 1 }).withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Docente, "id", "el docente", "ID")),

    validarCampoRequerido("grupoId", "Seleccione el grupo correspondiente.")
        .isInt({ min: 1 }).withMessage("El grupo seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Grupo, "id", "el grupo", "ID")),

    validarCampoRequerido("asignaturaId", "Seleccione la asignatura correspondiente.")
        .isInt({ min: 1 }).withMessage("La asignatura seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorCampo(Asignatura, "id", "la asignatura", "ID")),

    validationErrorHandler,
];

export const validarActualizarCarga = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El identificador de la carga no es válido."),

    validarCampoOpcionalRequerido("codigo", "Ingrese el código si desea actualizarlo.")
        .isLength({ max: 10 }).withMessage("El código no debe exceder los 10 caracteres."),

    validarCampoOpcionalRequerido("horas", "Ingrese el número de horas si desea actualizarlo.")
        .isInt({ min: 1, max: 40 }).withMessage("Las horas deben estar entre 1 y 40."),

    body("sedeId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorCampo(Sede, "id", "la sede", "ID")),

    body("docenteId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Docente, "id", "el docente", "ID")),

    body("grupoId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El grupo seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Grupo, "id", "el grupo", "ID")),

    body("asignaturaId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("La asignatura seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorCampo(Asignatura, "id", "la asignatura", "ID")),

    validationErrorHandler,
];

export const validarCargaExistente = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El identificador de la carga no es válido."),
    validationErrorHandler,
];