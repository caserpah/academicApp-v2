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

// Valores permitidos para los ENUMs (según tu modelo)
const ENUMS = {
    nivelEducativo: ["NS", "TC", "LC", "PF", "MA", "DO", "OT"],
    nivelEnsenanza: ["PE", "BP", "BS", "MA", "OT"],
    vinculacion: ["PD", "PP", "PV", "TR", "OT"]
};

/** Regex para campos comunes */
const regexDocumento = /^[0-9]{4,20}$/;
const regexTelefono = /^[0-9]{10,12}$/;

export const ValidarCrearDocente = [

    /** Documento */
    validarCampoRequerido("documento", "Ingrese el número de documento del docente.")
        .matches(regexDocumento)
        .withMessage("El documento debe contener mínimo 4 dígitos.")
        .bail()
        .custom(validarCampoUnico(Docente, "documento", "un docente", false, null, "número de documento")),

    /** Nombre */
    validarCampoRequerido("nombre", "Ingrese el nombre del docente.")
        .isLength({ min: 3 }).withMessage("El nombre debe tener al menos 3 caracteres."),

    /** Apellidos */
    validarCampoRequerido("apellidos", "Ingrese los apellidos del docente.")
        .isLength({ min: 3 }).withMessage("Los apellidos deben tener al menos 3 caracteres."),

    /** Fecha nacimiento */
    validarFechaNoFutura("fechaNacimiento", "de nacimiento"),

    /** Email */
    validarCampoRequerido("email", "Ingrese el correo electrónico")
        .isEmail().withMessage("Ingrese un correo electrónico válido."),

    /** Teléfono */
    validarCampoOpcional("telefono")
        .matches(regexTelefono)
        .withMessage("El teléfono debe contener entre 10 y 12 dígitos."),

    /** Nivel educativo */
    validarCampoRequerido("nivelEducativo", "Seleccione el nivel educativo.")
        .isIn(ENUMS.nivelEducativo)
        .withMessage("Nivel educativo inválido."),

    /** Profesión */
    body("profesion").optional({ checkFalsy: true })
        .isLength({ min: 5 }).withMessage("El nombre de la profesión debe contener mínimo 5 caracteres."),

    /** Nivel enseñanza */
    validarCampoRequerido("nivelEnsenanza", "Seleccione el nivel de enseñanza.")
        .isIn(ENUMS.nivelEnsenanza)
        .withMessage("Nivel de enseñanza inválido."),

    /** Fecha de nombramiento */
    validarFechaNoFutura("fechaNombrado", "de nombramiento", true),

    /** Tipo vinculación */
    validarCampoRequerido("vinculacion", "Seleccione el tipo de vinculación.")
        .isIn(ENUMS.vinculacion)
        .withMessage("Tipo de vinculación inválido."),

    /** Fechas laborales */
    validarFechaNoFutura("fechaIngreso", "de ingreso", true),
    validarFechaNoFutura("fechaRetiro", "de retiro", true),

    // Validación cruzada de fechas
    body().custom(validarOrdenFechas),

    /** Dirección */
    validarCampoOpcional("direccion")
        .isLength({ min: 5 })
        .withMessage("La dirección debe tener al menos 5 caracteres."),

    /** Área */
    validarCampoOpcional("areaEnsenanza", "Seleccione el área de enseñanza del docente.")
        .isLength({ min: 5 })
        .withMessage("El nombre del área de enseñanza debe tener al menos 5 caracteres."),

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
        .withMessage("El documento debe contener mínimo 4 dígitos.")
        .bail()
        .custom(validarCampoUnico(Docente, "documento", "un docente", true, null, "número de documento")),

    /** Nombre */
    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre del docente.")
        .isLength({ min: 3 })
        .withMessage("El nombre debe tener al menos 3 caracteres."),

    /** Apellidos */
    validarCampoOpcionalRequerido("apellidos", "Ingrese los apellidos del docente.")
        .isLength({ min: 3 })
        .withMessage("Los apellidos deben tener al menos 3 caracteres."),

    /** Fecha de nacimiento */
    validarFechaNoFutura("fechaNacimiento", "de nacimiento"),

    /** Email opcional */
    validarCampoOpcionalRequerido("email", "Ingrese el correo electrónico")
        .isEmail().withMessage("Ingrese un correo electrónico válido."),

    /** Teléfono opcional */
    validarCampoOpcional("telefono")
        .matches(regexTelefono)
        .withMessage("El teléfono debe contener entre 10 y 12 dígitos."),

    /** Nivel educativo */
    validarCampoOpcionalRequerido("nivelEducativo", "Seleccione el nivel educativo.")
        .isIn(ENUMS.nivelEducativo)
        .withMessage("Nivel educativo inválido."),

    /** Profesión */
    body("profesion").optional({ checkFalsy: true })
        .isLength({ min: 5 }).withMessage("El nombre de la profesión debe contener mínimo 5 caracteres."),

    /** Nivel enseñanza */
    validarCampoOpcionalRequerido("nivelEnsenanza", "Seleccione el nivel de enseñanza.")
        .isIn(ENUMS.nivelEnsenanza)
        .withMessage("Nivel de enseñanza inválido."),

    /** Fecha de nombramiento */
    validarFechaNoFutura("fechaNombrado", "de nombramiento", true),

    /** Vinculación */
    validarCampoOpcionalRequerido("vinculacion", "Seleccione el tipo de vinculación.")
        .isIn(ENUMS.vinculacion)
        .withMessage("Tipo de vinculación inválido."),

    /** Fechas ingreso / retiro */
    validarFechaNoFutura("fechaIngreso", "de ingreso", true),
    validarFechaNoFutura("fechaRetiro", "de retiro", true),
    body().custom(validarOrdenFechas),

    /** Dirección */
    validarCampoOpcional("direccion")
        .isLength({ min: 5 })
        .withMessage("La dirección debe tener al menos 5 caracteres."),

    /** Área */
    validarCampoOpcional("areaEnsenanza", "Seleccione el área de enseñanza del docente.")
        .isLength({ min: 5 })
        .withMessage("El nombre del área de enseñanza debe tener al menos 5 caracteres."),

    validationErrorHandler,
];