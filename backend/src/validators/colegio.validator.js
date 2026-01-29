import { body, param } from "express-validator";
import { Colegio } from "../models/colegio.js";
import {
    validarCampoRequerido,
    validarCampoUnico,
    verificarExistenciaPorId,
    validarCampoContactoOpcional,
    validarCampoOpcionalRequerido,
    validarFechaNoFutura,
} from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

/**
 * Validadores para el modelo Colegio
 * ------------------------------------
 * Se aprovechan las funciones definidas en utils/dbUtils.js
 * para mantener consistencia en todas las reglas de validación.
 */

// Validar crear colegio
export const validarCrearColegio = [
    validarCampoRequerido("registroDane", "Ingrese el registro DANE del colegio.")
        .isLength({ max: 20 }).withMessage("El registro DANE no debe exceder los 20 caracteres.")
        .isAlphanumeric().withMessage("El registro DANE solo puede contener letras y números.")
        .bail()
        .custom(validarCampoUnico(Colegio, "registroDane", "un colegio", false, null, "registro DANE")),

    validarCampoRequerido("nombre", "Ingrese el nombre del colegio.")
        .isLength({ max: 80 }).withMessage("El nombre no debe exceder los 80 caracteres."),

    body("email")
        .optional({ checkFalsy: true })
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .isLength({ max: 80 }).withMessage("El correo no debe exceder los 80 caracteres."),

    validarCampoContactoOpcional("contacto"),

    validarCampoRequerido("direccion", "Ingrese la dirección del colegio.")
        .isLength({ max: 80 }).withMessage("La dirección no debe exceder los 80 caracteres."),

    validarCampoRequerido("ciudad", "Ingrese el nombre de la ciudad.")
        .isLength({ max: 20 }).withMessage("El nombre de la ciudad no debe exceder los 20 caracteres."),

    validarCampoRequerido("departamento", "Ingrese el nombre del departamento.")
        .isLength({ max: 20 }).withMessage("El nombre del departamento no debe exceder los 20 caracteres."),

    validarCampoRequerido("resolucion", "Ingrese el número de resolución de funcionamiento.")
        .isLength({ max: 10 }).withMessage("El número de resolución no debe exceder los 10 caracteres.")
        .isAlphanumeric().withMessage("El número de resolución solo puede contener letras y números."),

    validarFechaNoFutura("fechaResolucion", "de la resolución de funcionamiento", false),

    validarCampoRequerido("promocion", "Ingrese el número del decreto de promoción.")
        .isLength({ max: 10 }).withMessage("El número del decreto no debe exceder los 10 caracteres.")
        .isAlphanumeric().withMessage("El número del decreto solo puede contener letras y números."),

    validarFechaNoFutura("fechaPromocion", "del decreto de promoción", false),

    validarCampoRequerido("secretaria", "Ingrese el nombre de la secretaria.")
        .isLength({ max: 80 }).withMessage("El nombre de la secretaria no debe exceder los 80 caracteres."),

    validarCampoRequerido("ccSecretaria", "Ingrese el documento de la secretaria es requerido.")
        .isLength({ min: 5, max: 15 }).withMessage("El documento debe tener entre 5 y 15 dígitos.")
        .isNumeric().withMessage("El documento de la secretaria solo debe contener números."),

    validarCampoRequerido("director", "Ingrese el nombre del director del colegio.")
        .isLength({ max: 80 }).withMessage("El nombre del director no debe exceder los 80 caracteres."),

    validarCampoRequerido("ccDirector", "Ingrese el documento del director.")
        .isLength({ min: 5, max: 15 }).withMessage("El documento debe tener entre 5 y 15 dígitos.")
        .isNumeric().withMessage("El documento del director solo debe contener números."),

    validationErrorHandler,
];

// Validar actualizar colegio
export const validarActualizarColegio = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El colegio seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Colegio, "id", "el colegio solicitado")),

    validarCampoOpcionalRequerido("registroDane", "Ingrese el número de registro DANE si desea actualizarlo.")
        .isLength({ max: 20 }).withMessage("El registro DANE no debe exceder los 20 caracteres.")
        .isAlphanumeric().withMessage("El registro DANE solo puede contener letras y números.")
        .bail()
        .custom(validarCampoUnico(Colegio, "registroDane", "un colegio", true, null, "registro DANE")),

    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre del colegio si desea actualizarlo.")
        .isLength({ max: 80 }).withMessage("El nombre no debe exceder los 80 caracteres."),

    body("email")
        .optional({ checkFalsy: true })
        .isEmail().withMessage("Ingrese un correo electrónico válido.")
        .isLength({ max: 80 }).withMessage("El correo no debe exceder los 80 caracteres."),

    body("contacto")
        .optional({ checkFalsy: true })
        .isLength({ min: 10, max: 12 }).withMessage("El número de contacto debe tener entre 10 y 12 dígitos.")
        .isNumeric().withMessage("El número de contacto solo debe contener números."),

    validarCampoOpcionalRequerido("direccion", "Ingrese la dirección si desea actualizarla.")
        .isLength({ max: 80 }).withMessage("La dirección no debe exceder los 80 caracteres."),

    validarCampoOpcionalRequerido("ciudad", "Ingrese el nombre de la ciudad si desea actualizarlo.")
        .isLength({ max: 20 }).withMessage("El nombre de la ciudad no debe exceder los 20 caracteres."),

    validarCampoOpcionalRequerido("departamento", "Ingrese el nombre del departamento si desea actualizarlo.")
        .isLength({ max: 20 }).withMessage("El nombre del departamento no debe exceder los 20 caracteres."),

    validarCampoOpcionalRequerido("resolucion", "Ingrese el número de resolución de funcionamiento si desea actualizarlo.")
        .isLength({ max: 10 }).withMessage("El número de resolución no debe exceder los 10 caracteres.")
        .isAlphanumeric().withMessage("El número de resolución solo puede contener letras y números."),

    validarFechaNoFutura("fechaResolucion", "de la resolución de funcionamiento", false),

    validarCampoOpcionalRequerido("promocion", "Ingrese el número del decreto de promoción si desea actualizarlo.")
        .isLength({ max: 10 }).withMessage("El número del decreto no debe exceder los 10 caracteres.")
        .isAlphanumeric().withMessage("El número del decreto solo puede contener letras y números."),

    validarFechaNoFutura("fechaPromocion", "del decreto de promoción", false),

    validarCampoOpcionalRequerido("secretaria", "Ingrese el nombre de la secretaria si desea actualizarlo.")
        .isLength({ max: 80 }).withMessage("El nombre de la secretaria no debe exceder los 80 caracteres."),

    validarCampoOpcionalRequerido("ccSecretaria", "Ingrese el documento de la secretaria si desea actualizarlo.")
        .isLength({ min: 5, max: 15 }).withMessage("El documento debe tener entre 5 y 15 dígitos.")
        .isNumeric().withMessage("El documento de la secretaria solo debe contener números."),

    validarCampoOpcionalRequerido("director", "Ingrese el nombre del director si desea actualizarlo.")
        .isLength({ max: 80 }).withMessage("El nombre del director no debe exceder los 80 caracteres."),

    validarCampoOpcionalRequerido("ccDirector", "Ingrese el documento del director si desea actualizarlo.")
        .isLength({ min: 5, max: 15 }).withMessage("El documento debe tener entre 5 y 15 dígitos.")
        .isNumeric().withMessage("El documento del director solo debe contener números."),

    validationErrorHandler,
];