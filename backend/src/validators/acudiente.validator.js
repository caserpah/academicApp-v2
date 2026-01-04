import { body, param } from "express-validator";
import { Acudiente } from "../models/acudiente.js";

import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    validarCampoUnico,
    validarCampoContactoOpcional
} from "../utils/dbUtils.js";

import { validationErrorHandler } from "./validationErrorHandler.js";

const regexDocumento = /^[A-Za-z0-9]{4,20}$/;

/** ENUMS */
const ENUM_TIPO_DOC = ["RC", "TI", "CC", "CE", "PA"];
const ENUM_AFINIDAD = ["PADRE", "MADRE", "HERMANO", "HERMANA", "TIO", "TIA", "ABUELO", "ABUELA", "TUTOR", "OTRO"];

export const ValidarCrearAcudiente = [

    /** Tipo de documento */
    validarCampoRequerido("tipoDocumento", "Seleccione el tipo de documento.")
        .isIn(ENUM_TIPO_DOC)
        .withMessage("El tipo de documento no es válido."),

    /** Documento único global */
    validarCampoRequerido("documento", "Ingrese el número de documento.")
        .matches(regexDocumento)
        .withMessage("El documento debe contener entre 4 y 20 caracteres alfanuméricos, sin espacios.")
        .bail()
        .custom(
            validarCampoUnico(Acudiente, "documento", "un acudiente", false, null, "número de documento")
        ),

    /** Primer nombre */
    validarCampoRequerido("primerNombre", "Ingrese el primer nombre.")
        .isLength({ min: 2 })
        .withMessage("El primer nombre debe contener al menos 2 caracteres."),

    /** Segundo nombre opcional */
    body("segundoNombre").optional({ checkFalsy: true }).trim().escape(),

    /** Primer apellido */
    validarCampoRequerido("primerApellido", "Ingrese el primer apellido.")
        .isLength({ min: 2 })
        .withMessage("El primer apellido debe contener al menos 2 caracteres."),

    /** Segundo apellido opcional */
    body("segundoApellido").optional({ checkFalsy: true }).trim().escape(),

    /** Dirección */
    body("direccion")
        .optional({ checkFalsy: true })
        .isLength({ min: 5 })
        .withMessage("La dirección de residencia debe tener al menos 5 caracteres."),

    /** Contacto */
    validarCampoContactoOpcional("contacto"),

    /** Email (Opcional pero con formato válido) */
    body("email")
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .normalizeEmail(),

    validationErrorHandler
];

export const ValidarActualizarAcudiente = [

    /** Validar ID */
    param("id")
        .isInt({ min: 1 })
        .withMessage("El acudiente seleccionado no es válido."),

    /** Tipo documento */
    validarCampoOpcionalRequerido("tipoDocumento", "Seleccione el tipo de documento.")
        .isIn(ENUM_TIPO_DOC)
        .withMessage("El tipo de documento no es válido."),

    /** Documento único editando */
    validarCampoOpcionalRequerido("documento", "Ingrese el número de documento.")
        .matches(regexDocumento)
        .withMessage("El documento debe contener entre 4 y 20 caracteres alfanuméricos, sin espacios.")
        .bail()
        .custom(validarCampoUnico(Acudiente, "documento", "un acudiente", true, null, "número de documento")
        ),

    /** Primer nombre */
    validarCampoOpcionalRequerido("primerNombre", "Ingrese el primer nombre.")
        .isLength({ min: 2 })
        .withMessage("El primer nombre debe contener al menos 2 caracteres."),

    /** Segundo nombre opcional */
    body("segundoNombre").optional({ checkFalsy: true }).trim().escape(),

    /** Primer apellido */
    validarCampoOpcionalRequerido("primerApellido", "Ingrese el primer apellido.")
        .isLength({ min: 2 })
        .withMessage("El primer apellido debe contener al menos 2 caracteres."),

    /** Segundo apellido opcional */
    body("segundoApellido").optional({ checkFalsy: true }).trim().escape(),

    // Dirección
    body("direccion").optional({ checkFalsy: true }).trim().escape(),

    // Contacto (Opcional)
    validarCampoContactoOpcional("contacto"),

    // Email (Opcional pero con formato válido)
    body("email")
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .normalizeEmail(),

    validationErrorHandler
];

export const ValidarAsignarAcudiente = [
    // --- 1. DATOS DE ENLACE ---
    body("estudianteId")
        .notEmpty().withMessage("Seleccione un estudiante.")
        .isInt().withMessage("El estudiante seleccionado no es válido."),

    body("afinidad")
        .notEmpty().withMessage("Seleccione el parentesco.")
        .isIn(ENUM_AFINIDAD).withMessage("El parentesco seleccionado no es válido."),

    // --- 2. DATOS DE LA PERSONA (Igual a Crear, pero SIN check de unicidad) ---

    // Tipo Documento
    validarCampoRequerido("tipoDocumento", "Seleccione el tipo de documento.")
        .isIn(ENUM_TIPO_DOC).withMessage("El tipo de documento no es válido."),

    // Documento (SOLO FORMATO, quitamos validarCampoUnico)
    validarCampoRequerido("documento", "Ingrese el número de documento.")
        .matches(regexDocumento) // Usamos la regex que ya definiste arriba
        .withMessage("El documento debe contener entre 4 y 20 caracteres alfanuméricos, sin espacios."),

    // Nombres
    validarCampoRequerido("primerNombre", "Ingrese el primer nombre.")
        .isLength({ min: 2 })
        .withMessage("El primer nombre debe contener al menos 2 caracteres."),

    body("segundoNombre").optional({ checkFalsy: true }).trim().escape(),

    // Apellidos
    validarCampoRequerido("primerApellido", "Ingrese el primer apellido.")
        .isLength({ min: 2 })
        .withMessage("El primer apellido debe contener al menos 2 caracteres."),

    body("segundoApellido").optional({ checkFalsy: true }).trim().escape(),

    // Contacto (Opcional)
    validarCampoContactoOpcional("contacto"),

    // Email
    body("email")
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .normalizeEmail(),

    // Dirección
    body("direccion").optional({ checkFalsy: true }).trim().escape(),

    validationErrorHandler
];