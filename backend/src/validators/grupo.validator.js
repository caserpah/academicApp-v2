import { body, param } from "express-validator";
import { Grado } from "../models/grado.js";
import { Sede } from "../models/sede.js";
import { Docente } from "../models/docente.js";
import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

// Expresión regular para letras, números, espacios y guiones simples
const NOMBRE_GRUPO_REGEX = /^[A-Za-z0-9\s\-]+$/;

export const validarCrearGrupo = [
    validarCampoRequerido("nombre", "Ingrese el nombre del grupo.")
        .isLength({ max: 10 }).withMessage("El nombre del grupo no debe exceder los 10 caracteres.")
        .matches(NOMBRE_GRUPO_REGEX)
        .withMessage("El nombre del grupo solo puede contener letras, números, espacios y guiones."),

    validarCampoRequerido("gradoId", "Seleccione el grado del grupo.")
        .isInt({ min: 1 })
        .withMessage("El grado seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado")),

    validarCampoRequerido("jornada", "Seleccione la jornada.")
        .isIn(["MANANA", "TARDE", "NOCHE", "COMPLETA"])
        .withMessage("La jornada seleccionada no es válida."),

    validarCampoRequerido("sedeId", "Seleccione la sede.")
        .isInt({ min: 1 }).withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Sede, "id", "la sede", "ID")),

    // directorId es OPCIONAL
    body("directorId")
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Docente, "id", "el docente seleccionado", "ID")),

    validationErrorHandler,
];

export const validarActualizarGrupo = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El grupo seleccionado no es válido."),

    validarCampoOpcionalRequerido("nombre", "Ingrese un nombre válido para el grupo.")
        .isLength({ max: 10 }).withMessage("El nombre del grupo no debe exceder los 10 caracteres.")
        .matches(NOMBRE_GRUPO_REGEX)
        .withMessage("El nombre del grupo solo puede contener letras, números, espacios y guiones."),

    validarCampoOpcionalRequerido("gradoId", "Seleccione el grado del grupo.")
        .isInt({ min: 1 })
        .withMessage("El grado seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado")),

    validarCampoOpcionalRequerido("jornada", "Seleccione la jornada.")
        .isIn(["MANANA", "TARDE", "NOCHE", "COMPLETA"])
        .withMessage("La jornada seleccionada no es válida."),

    validarCampoOpcionalRequerido("sedeId", "Seleccione la sede.")
        .isInt({ min: 1 }).withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Sede, "id", "la sede", "ID")),

    body("directorId")
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Docente, "id", "el docente seleccionado", "ID")),

    validationErrorHandler,
];