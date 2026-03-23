import { body, param } from "express-validator";
import { Usuario } from "../models/usuario.js";
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

    /** Documento (Validación Inteligente para Creación Múltiple) */
    validarCampoRequerido("documento", "Ingrese el número de documento.")
        .matches(regexDocumento)
        .withMessage("El documento debe contener entre 4 y 20 caracteres alfanuméricos, sin espacios.")
        .bail()
        .custom(async (value) => {
            // Buscamos si la persona ya existe
            const usuarioExistente = await Usuario.findOne({ where: { documento: value } });

            if (usuarioExistente) {
                // Si existe, verificamos si YA es Acudiente. Si lo es, bloqueamos. Si no, dejamos pasar.
                const acudienteExistente = await Acudiente.findOne({ where: { usuarioId: usuarioExistente.id } });
                if (acudienteExistente) {
                    throw new Error("Ya existe un acudiente registrado con este número de documento.");
                }
            }
            return true;
        }),

    /** Nombres unificados */
    validarCampoRequerido("nombre", "Ingrese el nombre completo.")
        .isLength({ min: 2 })
        .withMessage("El nombre debe contener al menos 2 caracteres."),

    /** Apellidos unificados */
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
        .custom(async (value, { req }) => {
            const acudienteId = req.params.id;

            // 1. Buscamos el acudiente actual para saber cuál es su 'usuarioId' real
            const acudiente = await Acudiente.findByPk(acudienteId);
            if (!acudiente) throw new Error("Acudiente no encontrado.");

            // 2. Buscamos si el documento ya existe en la tabla Usuarios
            const usuarioExistente = await Usuario.findOne({ where: { documento: value } });

            // 3. Si existe, y su ID NO es el mismo que el usuario asociado a este acudiente, ¡es un clon!
            if (usuarioExistente && usuarioExistente.id !== acudiente.usuarioId) {
                throw new Error("Este número de documento ya está registrado por otro usuario.");
            }
            return true;
        }),

    /** Nombres y Apellidos */
    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre.")
        .isLength({ min: 2 }).withMessage("El nombre debe contener al menos 2 caracteres."),

    validarCampoOpcionalRequerido("apellidos", "Ingrese los apellidos.")
        .isLength({ min: 2 }).withMessage("Los apellidos deben contener al menos 2 caracteres."),

    body("direccion").optional({ checkFalsy: true }).trim().escape(),
    validarCampoContactoOpcional("telefono"),
    body("email").optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),

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
    validarCampoRequerido("tipoDocumento", "Seleccione el tipo de documento.").isIn(ENUM_TIPO_DOC),
    validarCampoRequerido("documento", "Ingrese el número de documento.").matches(regexDocumento),
    validarCampoRequerido("nombre", "Ingrese el nombre completo.").isLength({ min: 2 }),
    validarCampoRequerido("apellidos", "Ingrese los apellidos completos.").isLength({ min: 2 }),
    validarCampoContactoOpcional("telefono"),
    body("email").optional({ checkFalsy: true }).trim().isEmail().normalizeEmail(),
    body("direccion").optional({ checkFalsy: true }).trim().escape(),

    validationErrorHandler
];