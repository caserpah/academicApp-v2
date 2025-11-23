import { body, param } from "express-validator";
import { Coordinador } from "../models/coordinador.js";
import {
    validarCampoOpcional,
    verificarExistenciaPorId,
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    validarCampoContactoOpcional,
    validarCampoUnico
} from "../utils/dbUtils.js";

export const validarCrearCoordinador = [
    validarCampoRequerido("documento", "Ingrese el número de documento del coordinador.")
        .isLength({ max: 15 }).withMessage("El documento no debe exceder los 15 dígitos.")
        .isNumeric().withMessage("El documento solo debe contener números.")
        .bail()
        .custom(validarCampoUnico(Coordinador, "documento", "un coordinador", false, null, "número de documento")),

    validarCampoRequerido("nombre", "Ingrese el nombre completo del coordinador.")
        .isLength({ min: 3, max: 80 })
        .withMessage("El nombre del coordinador debe tener entre 3 y 80 caracteres."),

    body("email")
        .optional({ checkFalsy: true })
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .withMessage("Ingrese un correo electrónico válido para el coordinador.")
        .isLength({ max: 80 }).withMessage("El correo no debe exceder los 80 caracteres."),

    validarCampoContactoOpcional("telefono"),

    validarCampoOpcional("direccion"),
];

export const validarActualizarCoordinador = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El coordinador seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Coordinador, "id", "el coordinador", "ID")),

    validarCampoOpcionalRequerido("documento", "Ingrese el número de documento si desea actualizarlo.")
        .isLength({ max: 15 }).withMessage("El documento no debe exceder los 15 dígitos.")
        .isNumeric().withMessage("El documento solo debe contener números.")
        .bail()
        .custom(validarCampoUnico(Coordinador, "documento", "un coordinador", true, null, "número de documento")),

    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre del coordinador si desea actualizarlo.")
        .isLength({ min: 3, max: 80 })
        .withMessage("El nombre del coordinador debe tener entre 3 y 80 caracteres."),

    body("email")
        .optional({ checkFalsy: true })
        .isEmail().withMessage("Ingrese un correo electrónico válido para el coordinador.")
        .isLength({ max: 80 }).withMessage("El correo no debe exceder los 80 caracteres."),

    validarCampoContactoOpcional("telefono"),

    validarCampoOpcional("direccion"),
];