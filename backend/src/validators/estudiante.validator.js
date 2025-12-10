import { body, check, param } from "express-validator";
import { Estudiante } from "../models/estudiante.js";

import {
    validarCampoRequerido,
    validarCampoOpcional,
    validarCampoOpcionalRequerido,
    validarCampoUnico,
    validarFechaNoFutura,
    validarCampoContactoOpcional
} from "../utils/dbUtils.js";

import { validationErrorHandler } from "./validationErrorHandler.js";

/** Regex */
const regexNombre = /^[A-Za-zÁÉÍÓÚÑáéíóúñüÜ\s]+$/;
const regexDocumento = /^[A-Za-z0-9]{4,20}$/;

/** ENUMS */
const ENUM_TIPO_DOC = ["RC", "TI", "CC", "CE", "PA", "NIP", "NUIP", "NES"];
const ENUM_SEXO = ["M", "F", "I"];
const ENUM_VICTIMAS = ["DZ", "DG", "HD", "OT", "NA"];
const ENUM_DISCAPACIDAD = ["DA", "DF", "DI", "DM", "NA", "DP", "DS", "DV"];
const ENUM_CAPACIDADES = ["SD", "TC", "TT", "TS", "NA"];
const ENUM_ETNIA = ["RM", "IG", "NR", "PL", "RZ", "NA"];

export const ValidarCrearEstudiante = [

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
            validarCampoUnico(Estudiante, "documento", "un estudiante", false, null, "número de documento")
        ),

    /** Primer nombre */
    validarCampoRequerido("primerNombre", "Ingrese el primer nombre.")
        .matches(regexNombre)
        .withMessage("El primer nombre solo puede contener letras y espacios."),

    /** Segundo nombre opcional */
    body("segundoNombre")
        .optional({ checkFalsy: true })
        .matches(regexNombre)
        .withMessage("El segundo nombre solo puede contener letras y espacios."),

    /** Primer apellido */
    validarCampoRequerido("primerApellido", "Ingrese el primer apellido.")
        .matches(regexNombre)
        .withMessage("El primer apellido solo puede contener letras y espacios."),

    /** Segundo apellido opcional */
    body("segundoApellido")
        .optional({ checkFalsy: true })
        .matches(regexNombre)
        .withMessage("El segundo apellido solo puede contener letras y espacios."),

    /** Fecha nacimiento */
    validarFechaNoFutura("fechaNacimiento", "de nacimiento"),

    /** Sexo */
    validarCampoRequerido("sexo", "Seleccione el sexo del estudiante.")
        .isIn(ENUM_SEXO)
        .withMessage("El sexo seleccionado no es válido."),

    /** RH opcional */
    body("rh")
        .optional({ checkFalsy: true })
        .isLength({ min: 2, max: 4 })
        .withMessage("El Tipo de sangre debe tener entre 2 y 4 caracteres."),

    /** Dirección */
    body("direccion")
        .optional({ checkFalsy: true })
        .isLength({ min: 5 })
        .withMessage("La dirección de residencia debe tener al menos 5 caracteres."),

    /** Barrio */
    body("barrio")
        .optional({ checkFalsy: true })
        .isLength({ min: 3 })
        .withMessage("El nombre del barrio debe tener al menos 3 caracteres."),

    /** Contacto */
    validarCampoContactoOpcional("contacto"),

    /** Estrato */
    body("estrato")
        .optional({ checkFalsy: true })
        .isInt({ min: 1, max: 6 })
        .withMessage("El estrato debe estar entre 1 y 6."),

    /** SISBEN */
    body("sisben")
        .optional({ checkFalsy: true })
        .isLength({ min: 1 })
        .withMessage("La calificación del SISBEN debe ser un texto válido."),

    /** Regimen Subsidiado */
    body("subsidiado")
        .optional()
        .isBoolean()
        .withMessage("El campo 'subsidiado' debe ser verdadero o falso."),

    /** EPS */
    body("eps")
        .optional({ checkFalsy: true })
        .isLength({ min: 2 })
        .withMessage("El nombre de la EPS debe tener al menos 2 caracteres."),

    /** Víctimas */
    validarCampoRequerido("victimas", "Indique si el estudiante pertenece o no a la población victima del conflicto.")
        .isIn(ENUM_VICTIMAS)
        .withMessage("El valor seleccionado para población víctima del conflicto no es válido."),

    /** Discapacidad */
    validarCampoRequerido("discapacidad", "Indique si el estudiante tiene algún tipo de discapacidad o no.")
        .isIn(ENUM_DISCAPACIDAD)
        .withMessage("El valor seleccionado para tipo de discapacidad no es válido."),

    /** Capacidades */
    validarCampoRequerido("capacidades", "Indique si el estudiante tiene algún tipo de capacidad excepcional o no.")
        .isIn(ENUM_CAPACIDADES)
        .withMessage("El valor seleccionado para tipo de capacidades excepcionales no es válido."),

    /** Etnia */
    validarCampoRequerido("etnia", "Indique si el estudiante pertenece a alguna etnia o no.")
        .isIn(ENUM_ETNIA)
        .withMessage("El valor seleccionado para etnias no es válido."),

    validationErrorHandler,
];

export const ValidarActualizarEstudiante = [

    /** Validar ID */
    param("id")
        .isInt({ min: 1 })
        .withMessage("El estudiante seleccionado no es válido."),

    /** Tipo documento */
    validarCampoOpcionalRequerido("tipoDocumento", "Seleccione el tipo de documento.")
        .isIn(ENUM_TIPO_DOC)
        .withMessage("El tipo de documento no es válido."),

    /** Documento único editando */
    validarCampoOpcionalRequerido("documento", "Ingrese el número de documento.")
        .matches(regexDocumento)
        .withMessage("El documento debe contener entre 4 y 20 caracteres alfanuméricos, sin espacios.")
        .bail()
        .custom(validarCampoUnico(Estudiante, "documento", "un estudiante", true, null, "número de documento")
        ),

    /** Nombres y apellidos */
    validarCampoOpcionalRequerido("primerNombre", "Ingrese el primer nombre.")
        .matches(regexNombre)
        .withMessage("El primer nombre solo puede contener letras y espacios."),

    body("segundoNombre")
        .optional({ checkFalsy: true })
        .matches(regexNombre)
        .withMessage("El segundo nombre solo puede contener letras y espacios."),

    validarCampoOpcionalRequerido("primerApellido", "Ingrese el primer apellido.")
        .matches(regexNombre)
        .withMessage("El primer apellido solo puede contener letras y espacios."),

    body("segundoApellido")
        .optional({ checkFalsy: true })
        .matches(regexNombre)
        .withMessage("El segundo apellido solo puede contener letras y espacios."),

    /** Fecha nacimiento */
    validarCampoOpcionalRequerido("fechaNacimiento", "Debe ingresar la fecha de nacimiento.")
        .bail()
        .custom((value) => {
            if (value >= new Date().toISOString().split("T")[0]) {
                throw new Error("La fecha de nacimiento no puede ser futura.");
            }
            return true;
        }),

    /** Sexo */
    validarCampoOpcionalRequerido("sexo", "Seleccione el sexo del estudiante.")
        .isIn(ENUM_SEXO)
        .withMessage("El sexo seleccionado no es válido."),

    /** Campos opcionales */
    body("rh")
        .optional({ checkFalsy: true })
        .isLength({ min: 2, max: 4 })
        .withMessage("El Tipo de sangre debe tener entre 2 y 4 caracteres."),

    body("direccion")
        .optional({ checkFalsy: true })
        .isLength({ min: 5 })
        .withMessage("La dirección de residencia debe tener al menos 5 caracteres."),

    body("barrio")
        .optional({ checkFalsy: true })
        .isLength({ min: 3 })
        .withMessage("El nombre del barrio debe tener al menos 3 caracteres."),

    validarCampoContactoOpcional("contacto"),

    body("estrato")
        .optional({ checkFalsy: true })
        .isInt({ min: 1, max: 6 })
        .withMessage("El estrato debe estar entre 1 y 6."),

    body("sisben")
        .optional({ checkFalsy: true })
        .isLength({ min: 1 })
        .withMessage("La calificación del SISBEN debe ser un texto válido."),

    body("subsidiado")
        .optional()
        .isBoolean()
        .withMessage("El campo 'subsidiado' debe ser verdadero o falso."),

    body("eps")
        .optional({ checkFalsy: true })
        .isLength({ min: 2 })
        .withMessage("El nombre de la EPS debe tener al menos 2 caracteres."),

    validarCampoOpcionalRequerido("victimas", "Indique si el estudiante pertenece o no a la población victima del conflicto.")
        .isIn(ENUM_VICTIMAS)
        .withMessage("El valor seleccionado para población víctima del conflicto no es válido."),

    validarCampoOpcionalRequerido("discapacidad", "Indique si el estudiante tiene algún tipo de discapacidad o no.")
        .isIn(ENUM_DISCAPACIDAD)
        .withMessage("El valor seleccionado para tipo de discapacidad no es válido."),

    validarCampoOpcionalRequerido("capacidades", "Indique si el estudiante tiene algún tipo de capacidad excepcional o no.")
        .isIn(ENUM_CAPACIDADES)
        .withMessage("El valor seleccionado para tipo de capacidades excepcionales no es válido."),

    validarCampoOpcionalRequerido("etnia", "Indique si el estudiante pertenece a alguna etnia o no.")
        .isIn(ENUM_ETNIA)
        .withMessage("El valor seleccionado para etnias no es válido."),

    validationErrorHandler,
];