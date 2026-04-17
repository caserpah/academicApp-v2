import { body, param } from "express-validator";
import { Acudiente } from "../models/acudiente.js";

import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
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

    /** Documento */
    validarCampoRequerido("documento", "Ingrese el número de documento.")
        .matches(regexDocumento)
        .withMessage("El documento debe contener entre 4 y 20 caracteres alfanuméricos, sin espacios.")
        .bail()
        .custom(async (value) => {
            const acudienteExistente = await Acudiente.findOne({ where: { documento: value } });
            if (acudienteExistente) {
                throw new Error("Ya existe un acudiente registrado con este número de documento.");
            }
            return true;
        }),

    // Lugar de expedición del documento (Opcional)
    body("lugarExpedicion").optional({ checkFalsy: true }).trim().escape(),

        /** Nombre completo */
    validarCampoRequerido("nombres", "Ingrese los nombres completos.")
        .isLength({ min: 2 })
        .withMessage("El nombre debe contener al menos 2 caracteres."),

    /** Apellidos */
    validarCampoRequerido("apellidos", "Ingrese los apellidos completos.")
        .isLength({ min: 2 })
        .withMessage("Los apellidos deben contener al menos 2 caracteres."),

    /** Dirección */
    body("direccion")
        .optional({ checkFalsy: true })
        .isLength({ min: 5 })
        .withMessage("La dirección de residencia debe tener al menos 5 caracteres."),

    /** Contacto */
    validarCampoContactoOpcional("telefono"),

    /** Email */
    body("email")
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .normalizeEmail(),

    /** Fecha de nacimiento (Opcional) */
    body("fechaNacimiento")
        .optional({ checkFalsy: true }) // Permite que venga vacío, nulo o indefinido
        .isDate({ format: 'YYYY-MM-DD', strictMode: true })
        .withMessage("La fecha de nacimiento debe tener un formato válido (YYYY-MM-DD)."),

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

    validarCampoOpcionalRequerido("documento", "Ingrese el número de documento.")
        .matches(regexDocumento)
        .withMessage("El documento debe contener entre 4 y 20 caracteres alfanuméricos, sin espacios.")
        .bail()
        .custom(async (value, { req }) => {
            const acudienteId = parseInt(req.params.id, 10);

            const acudienteExistente = await Acudiente.findOne({ where: { documento: value } });

            // Si existe otro acudiente con esa cédula que no sea el que estamos editando
            if (acudienteExistente && acudienteExistente.id !== acudienteId) {
                throw new Error("Este número de documento ya está registrado por otro acudiente.");
            }
            return true;
        }),

    // Lugar de expedición del documento (Opcional)
    body("lugarExpedicion").optional({ checkFalsy: true }).trim().escape(),

    /** Nombres y Apellidos (Plural) */
    validarCampoOpcionalRequerido("nombres", "Ingrese los nombres.")
        .isLength({ min: 2 }).withMessage("El nombre debe contener al menos 2 caracteres."),

    validarCampoOpcionalRequerido("apellidos", "Ingrese los apellidos.")
        .isLength({ min: 2 }).withMessage("Los apellidos deben contener al menos 2 caracteres."),

    body("direccion").optional({ checkFalsy: true }).trim().escape(),
    validarCampoContactoOpcional("telefono"),
    body("email").optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),

    /** Fecha de nacimiento (Opcional) */
    body("fechaNacimiento")
        .optional({ checkFalsy: true }) // Permite que venga vacío, nulo o indefinido
        .isDate({ format: 'YYYY-MM-DD', strictMode: true })
        .withMessage("La fecha de nacimiento debe tener un formato válido (YYYY-MM-DD)."),

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

    // --- 2. DATOS DE LA PERSONA ---
    validarCampoRequerido("tipoDocumento", "Seleccione el tipo de documento.")
        .isIn(ENUM_TIPO_DOC).withMessage("El tipo de documento seleccionado no es válido."),

    validarCampoRequerido("documento", "Ingrese el número de documento.")
        .matches(regexDocumento).withMessage("El documento debe tener entre 4 y 20 caracteres, sin espacios."),

    // Lugar de expedición del documento (Opcional)
    body("lugarExpedicion").optional({ checkFalsy: true }).trim().escape(),

    validarCampoRequerido("nombres", "Ingrese los nombres completos.")
        .isLength({ min: 2 }).withMessage("Los nombres deben contener al menos 2 caracteres."),

    validarCampoRequerido("apellidos", "Ingrese los apellidos completos.")
        .isLength({ min: 2 }).withMessage("Los apellidos deben contener al menos 2 caracteres."),

    // La fecha que agregamos recientemente
    body("fechaNacimiento")
        .optional({ checkFalsy: true })
        .isDate({ format: 'YYYY-MM-DD', strictMode: true })
        .withMessage("La fecha de nacimiento debe tener un formato válido (YYYY-MM-DD)."),

    validarCampoContactoOpcional("telefono"),

    body("email")
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .normalizeEmail(),

    body("direccion").optional({ checkFalsy: true }).trim().escape(),

    validationErrorHandler
];