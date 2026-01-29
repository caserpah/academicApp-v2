import { body, param } from "express-validator";
import { Sede } from "../models/sede.js";
import {
    validarCampoUnico,
    verificarExistenciaPorId,
    validarCampoContactoOpcional,
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
} from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

// Validar crear sede
export const validarCrearSede = [
    validarCampoRequerido("codigo", "Ingrese el código de la sede.")
        .isLength({ max: 20 }).withMessage("El código de la sede no debe exceder los 20 caracteres.")
        .isAlphanumeric().withMessage("El código de la sede solo puede contener letras y números.")
        .bail()
        .custom(validarCampoUnico(Sede, "codigo", "una sede", false, null, "el código")),

    validarCampoRequerido("nombre", "Ingrese el nombre de la sede.")
        .isLength({ min: 3, max: 60 })
        .withMessage("El nombre de la sede debe tener entre 3 y 60 caracteres."),

    validarCampoRequerido("direccion", "Ingrese la dirección de la sede.")
        .isLength({ max: 80 }).withMessage("La dirección no debe exceder los 80 caracteres."),

    validarCampoContactoOpcional("contacto"),

    validationErrorHandler,
];

// Validar actualizar sede
export const validarActualizarSede = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Sede, "id", "la sede solicitada")),

    validarCampoOpcionalRequerido("codigo", "Ingrese el código de la sede si desea actualizarlo.")
        .isLength({ max: 20 }).withMessage("El código de la sede no debe exceder los 20 caracteres.")
        .isAlphanumeric().withMessage("El código de la sede solo puede contener letras y números.")
        .bail()
        .custom(validarCampoUnico(Sede, "codigo", "una sede", true, null, "el código")),

    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre de la sede si desea actualizarlo.")
        .isLength({ min: 3, max: 60 })
        .withMessage("El nombre de la sede debe tener entre 3 y 60 caracteres."),

    validarCampoOpcionalRequerido("direccion", "Ingrese la dirección si desea actualizarla.")
        .isLength({ max: 80 }).withMessage("La dirección no debe exceder los 80 caracteres."),

    validarCampoContactoOpcional("contacto"),

    validationErrorHandler,
];