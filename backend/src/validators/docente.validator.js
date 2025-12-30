import { body, param } from "express-validator";
import { Docente } from "../models/docente.js";
import { Area } from "../models/area.js";

import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    validarCampoOpcional,
    validarCampoUnico,
    verificarExistenciaPorId,
    validarFechaNoFutura,
    validarOrdenFechas
} from "../utils/dbUtils.js";

import { validationErrorHandler } from "./validationErrorHandler.js";

/** Regex para campos comunes */
const regexNombre = /^[A-Za-zÁÉÍÓÚÑáéíóúñüÜ\s]+$/;
const regexDocumento = /^[0-9]{4,20}$/;
const regexTelefono = /^[0-9]{7,12}$/;

/** ENUMS permitidos */
const ENUM_NIVEL_EDUCATIVO = ["BP", "NS", "TP", "OP", "PP", "PS", "OT"];
const ENUM_NIVEL_ENSENANZA = ["PE", "BP", "BS", "MA", "OT"];
const ENUM_VINCULACION = ["PD", "PP", "PV", "TR", "OT"];

export const ValidarCrearDocente = [

    /** Documento */
    validarCampoRequerido("documento", "Ingrese el número de documento del docente.")
        .matches(regexDocumento)
        .withMessage("El documento debe contener solo números.")
        .bail()
        .custom(
            validarCampoUnico(Docente, "documento", "un docente", false, null, "número de documento")
        ),

    /** Nombre */
    validarCampoRequerido("nombre", "Ingrese el nombre del docente.")
        .matches(regexNombre)
        .withMessage("El nombre solo puede contener letras y espacios."),

    /** Apellidos */
    validarCampoRequerido("apellidos", "Ingrese los apellidos del docente.")
        .matches(regexNombre)
        .withMessage("Los apellidos solo pueden contener letras y espacios."),

    /** Fecha nacimiento */
    validarFechaNoFutura("fechaNacimiento", "de nacimiento"),

    /** Email */
    validarCampoOpcional("email")
        .optional()
        .isEmail().withMessage("Ingrese un correo electrónico válido."),

    /** Teléfono */
    validarCampoOpcional("telefono")
        .optional()
        .matches(regexTelefono)
        .withMessage("El teléfono debe contener solo números."),

    /** Nivel educativo */
    validarCampoRequerido("nivelEducativo", "Seleccione el nivel educativo.")
        .isIn(ENUM_NIVEL_EDUCATIVO)
        .withMessage("Nivel educativo inválido."),

    /** Nivel enseñanza */
    validarCampoRequerido("nivelEnsenanza", "Seleccione el nivel de enseñanza.")
        .isIn(ENUM_NIVEL_ENSENANZA)
        .withMessage("Nivel de enseñanza inválido."),

    /** Fecha de nombramiento */
    validarFechaNoFutura("fechaNombrado", "de nombramiento", true),

    /** Tipo vinculación */
    validarCampoRequerido("vinculacion", "Seleccione el tipo de vinculación.")
        .isIn(ENUM_VINCULACION)
        .withMessage("Tipo de vinculación inválido."),

    /** Fechas laborales */
    validarFechaNoFutura("fechaIngreso", "de ingreso", true),
    validarFechaNoFutura("fechaRetiro", "de retiro", true),

    // Validación cruzada de fechas
    body().custom(validarOrdenFechas),

    /** Dirección */
    validarCampoOpcional("direccion")
        .optional()
        .isLength({ min: 5 })
        .withMessage("La dirección debe tener al menos 5 caracteres."),

    /** Área */
    validarCampoRequerido("areaId", "Seleccione el área del docente.")
        .isInt({ min: 1 })
        .withMessage("El área seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Area, "id", "el área seleccionada")),

    validationErrorHandler,
];

export const ValidarActualizarDocente = [

    param("id")
        .isInt({ min: 1 })
        .withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Docente, "id", "el docente")),

    /** Documento editable pero único */
    validarCampoOpcionalRequerido("documento", "Ingrese el número de documento del docente.")
        .matches(regexDocumento)
        .withMessage("El documento debe contener solo números.")
        .bail()
        .custom(validarCampoUnico(Docente, "documento", "un docente", true, null, "número de documento")),

    /** Nombre */
    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre del docente.")
        .matches(regexNombre)
        .withMessage("El nombre solo puede contener letras y espacios."),

    /** Apellidos */
    validarCampoOpcionalRequerido("apellidos", "Ingrese los apellidos del docente.")
        .matches(regexNombre)
        .withMessage("Los apellidos solo pueden contener letras y espacios."),

    /** Fecha de nacimiento */
    validarCampoOpcionalRequerido("fechaNacimiento", "Debe ingresar la fecha de nacimiento.")
        .isISO8601()
        .withMessage("La fecha de nacimiento debe ser válida (AAAA-MM-DD).")
        .bail()
        .custom((value) => {
            if (!value) return true;
            const fecha = new Date(value);
            if (fecha > new Date()) {
                throw new Error("La fecha de nacimiento no puede ser futura.");
            }
            return true;
        }),

    /** Email opcional */
    validarCampoOpcional("email")
        .optional()
        .isEmail().withMessage("Ingrese un correo electrónico válido."),

    /** Teléfono opcional */
    validarCampoOpcional("telefono")
        .optional()
        .matches(regexTelefono)
        .withMessage("El teléfono debe contener solo números."),

    /** Nivel educativo */
    validarCampoOpcionalRequerido("nivelEducativo", "Seleccione el nivel educativo.")
        .isIn(ENUM_NIVEL_EDUCATIVO)
        .withMessage("Nivel educativo inválido."),

    /** Nivel enseñanza */
    validarCampoOpcionalRequerido("nivelEnsenanza", "Seleccione el nivel de enseñanza.")
        .isIn(ENUM_NIVEL_ENSENANZA)
        .withMessage("Nivel de enseñanza inválido."),

    /** Fecha de nombramiento */
    validarFechaNoFutura("fechaNombrado", "de nombramiento", true),

    /** Vinculación */
    validarCampoOpcionalRequerido("vinculacion", "Seleccione el tipo de vinculación.")
        .isIn(ENUM_VINCULACION)
        .withMessage("Tipo de vinculación inválido."),

    /** Fechas ingreso / retiro */
    validarFechaNoFutura("fechaIngreso", "de ingreso", true),
    validarFechaNoFutura("fechaRetiro", "de retiro", true),
    body().custom(validarOrdenFechas),

    /** Dirección */
    validarCampoOpcional("direccion")
        .optional()
        .isLength({ min: 5 })
        .withMessage("La dirección debe tener al menos 5 caracteres."),

    /** Área */
    validarCampoOpcionalRequerido("areaId", "Seleccione el área del docente.")
        .isInt({ min: 1 })
        .withMessage("El área seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Area, "id", "el área seleccionada")),

    validationErrorHandler,
];