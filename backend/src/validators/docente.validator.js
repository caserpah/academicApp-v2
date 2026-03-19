import { body, param } from "express-validator";
import { Docente } from "../models/docente.js";
import { Usuario } from "../models/usuario.js";
import { Op } from "sequelize";
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
    nivelEducativo: ["NS", "TC", "LC", "PF", "ES", "MA", "DO", "OT"],
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
        .custom(validarCampoUnico(Usuario, "documento", "un docente", false, null, "número de documento")),

    /** Nombre y Apellidos */
    validarCampoRequerido("nombre", "Ingrese el nombre del docente.")
        .isLength({ min: 3 }).withMessage("El nombre debe tener al menos 3 caracteres."),

    validarCampoRequerido("apellidos", "Ingrese los apellidos del docente.")
        .isLength({ min: 3 }).withMessage("Los apellidos deben tener al menos 3 caracteres."),

    /** Fecha nacimiento */
    validarFechaNoFutura("fechaNacimiento", "de nacimiento"),

    /** Email */
    validarCampoRequerido("email", "Ingrese el correo electrónico")
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .bail()
        .custom(validarCampoUnico(Usuario, "email", "un docente", false, null, "correo electrónico")),

    /** Teléfono */
    validarCampoOpcional("telefono")
        .matches(regexTelefono)
        .withMessage("El teléfono debe contener entre 10 y 12 dígitos."),

    /** Perfil Profesional */
    validarCampoRequerido("nivelEducativo", "Seleccione el nivel educativo.")
        .isIn(ENUMS.nivelEducativo).withMessage("Nivel educativo inválido."),

    validarCampoRequerido("nivelEnsenanza", "Seleccione el nivel de enseñanza.")
        .isIn(ENUMS.nivelEnsenanza).withMessage("Nivel de enseñanza inválido."),

    body("profesion").optional({ checkFalsy: true })
        .isLength({ min: 5 }).withMessage("El nombre de la profesión debe contener mínimo 5 caracteres."),

    validarCampoOpcional("areaEnsenanza", "Seleccione el área de enseñanza del docente.")
        .isLength({ min: 5 }).withMessage("El nombre del área de enseñanza debe tener al menos 5 caracteres."),

    /** Dirección */
    validarCampoOpcional("direccion")
        .isLength({ min: 5 }).withMessage("La dirección debe tener al menos 5 caracteres."),

    /** --- CAMPOS ADMINISTRATIVOS (Agregados) --- */
    validarCampoOpcional("decretoLey")
        .isLength({ max: 10 }).withMessage("El Decreto Ley no puede exceder 10 caracteres."),

    validarCampoOpcional("escalafon")
        .isLength({ max: 10 }).withMessage("El Escalafón no puede exceder 10 caracteres."),

    validarCampoOpcional("decretoNombrado")
        .isLength({ max: 10 }).withMessage("El Decreto de Nombramiento no puede exceder 10 caracteres."),

    /** Vinculación y Fechas */
    validarCampoRequerido("vinculacion", "Seleccione el tipo de vinculación.")
        .isIn(ENUMS.vinculacion).withMessage("Tipo de vinculación inválido."),

    validarFechaNoFutura("fechaNombrado", "de nombramiento", true),
    validarFechaNoFutura("fechaIngreso", "de ingreso", true),
    validarFechaNoFutura("fechaRetiro", "de retiro", true),

    // Validación cruzada: Retiro no puede ser antes de Ingreso
    validarOrdenFechas("fechaIngreso", "fechaRetiro", "La fecha de retiro no puede ser anterior a la fecha de ingreso."),

    validationErrorHandler,
];

export const ValidarActualizarDocente = [

    param("id")
        .isInt({ min: 1 }).withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Docente, "id", "el docente")),

    /** Documento (Validación cruzada con la tabla Usuario) */
    validarCampoOpcionalRequerido("documento", "Ingrese el número de documento.")
        .matches(regexDocumento).withMessage("El documento debe contener mínimo 4 dígitos.")
        .custom(async (value, { req }) => {
            // 1. Buscamos al docente para saber cuál es su 'usuarioId' real
            const docente = await Docente.findByPk(req.params.id);
            if (!docente) return true;

            // 2. Buscamos si el documento existe en OTRO usuario
            const existe = await Usuario.findOne({
                where: {
                    documento: value,
                    id: { [Op.ne]: docente.usuarioId } // ¡Excluimos su verdadero ID de usuario!
                }
            });
            if (existe) throw new Error("Ya existe un docente con este número de documento.");
        }),

    /** Email (Validación cruzada con la tabla Usuario) */
    validarCampoOpcionalRequerido("email", "Ingrese el correo electrónico.")
        .isEmail().withMessage("Correo electrónico inválido.")
        .custom(async (value, { req }) => {
            const docente = await Docente.findByPk(req.params.id);
            if (!docente) return true;

            const existe = await Usuario.findOne({
                where: {
                    email: value,
                    id: { [Op.ne]: docente.usuarioId } // ¡Excluimos su verdadero ID de usuario!
                }
            });
            if (existe) throw new Error("Ya existe un docente con este correo electrónico.");
        }),

    /** Nombre */
    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre del docente.")
        .isLength({ min: 3 }).withMessage("El nombre debe tener al menos 3 caracteres."),

    /** Apellidos */
    validarCampoOpcionalRequerido("apellidos", "Ingrese los apellidos del docente.")
        .isLength({ min: 3 }).withMessage("Los apellidos deben tener al menos 3 caracteres."),

    /** Fecha de nacimiento */
    validarFechaNoFutura("fechaNacimiento", "de nacimiento"),

    /** Teléfono opcional */
    validarCampoOpcional("telefono")
        .matches(regexTelefono).withMessage("El teléfono debe contener entre 10 y 12 dígitos."),

    /** Dirección */
    validarCampoOpcional("direccion")
        .isLength({ min: 5 }).withMessage("La dirección debe tener al menos 5 caracteres."),

    /** Profesión */
    body("profesion").optional({ checkFalsy: true })
        .isLength({ min: 5 }).withMessage("El nombre de la profesión debe contener mínimo 5 caracteres."),

    /** Área */
    validarCampoOpcional("areaEnsenanza", "Seleccione el área de enseñanza del docente.")
        .isLength({ min: 5 }).withMessage("El nombre del área de enseñanza debe tener al menos 5 caracteres."),

    /** Administrativos en edición */
    body("decretoLey").optional({ checkFalsy: true })
        .isLength({ max: 10 }).withMessage("El Decreto Ley no puede exceder 10 caracteres."),

    body("escalafon").optional({ checkFalsy: true })
        .isLength({ max: 10 }).withMessage("El Escalafón no puede exceder 10 caracteres."),

    body("decretoNombrado").optional({ checkFalsy: true })
        .isLength({ max: 10 }).withMessage("El Decreto de Nombramiento no puede exceder 10 caracteres."),

    /** Nivel educativo */
    validarCampoOpcionalRequerido("nivelEducativo", "Seleccione el nivel educativo.")
        .isIn(ENUMS.nivelEducativo).withMessage("Nivel educativo inválido."),

    /** Nivel enseñanza */
    validarCampoOpcionalRequerido("nivelEnsenanza", "Seleccione el nivel de enseñanza.")
        .isIn(ENUMS.nivelEnsenanza).withMessage("Nivel de enseñanza inválido."),

    /** Vinculación */
    validarCampoOpcionalRequerido("vinculacion", "Seleccione el tipo de vinculación.")
        .isIn(ENUMS.vinculacion).withMessage("Tipo de vinculación inválido."),

    /** Fecha de nombramiento */
    validarFechaNoFutura("fechaNombrado", "de nombramiento", true),

    /** Fechas ingreso / retiro */
    validarFechaNoFutura("fechaIngreso", "de ingreso", true),
    validarFechaNoFutura("fechaRetiro", "de retiro", true),
    validarOrdenFechas("fechaIngreso", "fechaRetiro", "La fecha de retiro no puede ser anterior a la fecha de ingreso."),

    validationErrorHandler,
];