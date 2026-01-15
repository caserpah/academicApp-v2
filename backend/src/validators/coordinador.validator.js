import { body, param } from "express-validator";
import { Coordinador } from "../models/coordinador.js";
import {
    validarCampoUnico,
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    validarCampoContactoOpcional
} from "../utils/dbUtils.js";

export const validarCrearCoordinador = [
    validarCampoRequerido("documento", "Ingrese el número de documento del Coordinador.")
        .isLength({ min: 4, max: 15 }).withMessage("El documento debe tener entre 4 y 15 dígitos.")
        .isNumeric().withMessage("El documento solo debe contener números.")
        .bail()
        .custom(validarCampoUnico(Coordinador, "documento", "un Coordinador", false, null, "número de documento")),
    validarCampoRequerido("nombre", "Ingrese el nombre completo del Coordinador.")
        .isLength({ min: 3})
        .withMessage("El nombre del Coordinador debe tener mínimo 3 caracteres."),

    body("email")
        .optional({ checkFalsy: true })
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .withMessage("Ingrese un correo electrónico válido para el Coordinador."),

    validarCampoContactoOpcional("telefono"),

    // Las asignaciones se validan en el servicio por su complejidad lógica
    body("asignaciones").optional().isArray().withMessage("El formato de asignaciones es inválido.")
];

export const validarActualizarCoordinador = [
    param("id")
        .isInt()
        .withMessage("El Coordinador seleccionado no es válido."),

    validarCampoOpcionalRequerido("documento", "Ingrese el número de documento si desea actualizarlo.")
        .isLength({ min: 4, max: 15 }).withMessage("El documento debe tener entre 4 y 15 dígitos.")
        .isNumeric().withMessage("El documento solo debe contener números.")
        .bail()
        .custom(validarCampoUnico(Coordinador, "documento", "un Coordinador", true, null, "número de documento")),

    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre del coordinador.")
        .isLength({ min: 3})
        .withMessage("El nombre del Coordinador debe tener mínimo 3 caracteres."),

    body("email")
        .optional({ checkFalsy: true })
        .isEmail().withMessage("Ingrese una dirección de correo electrónico válida."),

    validarCampoContactoOpcional("telefono"),

    // Las asignaciones se validan en el servicio por su complejidad lógica
    body("asignaciones").optional().isArray().withMessage("El formato de asignaciones es inválido."),
]