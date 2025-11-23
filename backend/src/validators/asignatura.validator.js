import { param } from "express-validator";
import { Asignatura } from "../models/asignatura.js";
import { Area } from "../models/area.js";
import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    validarCampoUnico,
    verificarExistenciaPorId
} from "../utils/dbUtils.js";

// Validar crear asignatura
export const validarCrearAsignatura = [
    validarCampoRequerido("codigo", "Ingrese el código de la asignatura.")
        .isLength({ min: 3, max: 6 }).withMessage("El código de la asignatura debe tener entre 3 y 6 caracteres.")
        .isAlphanumeric().withMessage("El código de la asignatura solo puede contener letras y números.")
        .bail()
        .custom(validarCampoUnico(Asignatura, "codigo", "una asignatura", false, null, "el código")),

    validarCampoRequerido("nombre", "Ingrese el nombre de la asignatura.")
        .isLength({ min: 3, max: 60 })
        .withMessage("El nombre de la asignatura debe tener entre 3 y 60 caracteres.")
        .bail()
        .custom(validarCampoUnico(Asignatura, "nombre", "una asignatura", false, null, "el nombre")),

    validarCampoRequerido("abreviatura", "Ingrese la abreviatura de la asignatura.")
        .isLength({ min: 3, max: 6 }).withMessage("La abreviatura de la asignatura debe tener entre 3 y 6 caracteres.")
        .isAlphanumeric().withMessage("La abreviatura de la asignatura solo puede contener letras y números."),

    validarCampoRequerido("promociona", "Indique si la asignatura pertenece a un área que promociona o no."),

    validarCampoRequerido("porcentual", "Ingrese el peso porcentual de la asignatura.")
        .isFloat({ min: 1, max: 100 })
        .withMessage("El peso porcentual debe estar entre 1 y 100."),

    validarCampoRequerido("areaId", "Seleccione el área a la que pertenece la asignatura.")
        .isInt({ min: 1 })
        .withMessage("El identificador del área no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Area, "id", "el área seleccionada")),
];

// Validar actualizar asignatura
export const validarActualizarAsignatura = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("La asignatura seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura solicitada")),

    validarCampoOpcionalRequerido("codigo", "Ingrese el código de la asignatura si desea actualizarlo.")
        .isLength({ min: 3, max: 6 }).withMessage("El código de la asignatura debe tener entre 3 y 6 caracteres.")
        .isAlphanumeric().withMessage("El código de la asignatura solo puede contener letras y números.")
        .bail()
        .custom(validarCampoUnico(Asignatura, "codigo", "una asignatura", true, null, "el código")),

    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre de la asignatura si desea actualizarlo.")
        .isLength({ min: 3, max: 60 }).withMessage("El nombre de la asignatura debe tener entre 3 y 60 caracteres.")
        .bail()
        .custom(validarCampoUnico(Asignatura, "nombre", "una asignatura", true, null, "el nombre")),

    validarCampoOpcionalRequerido("abreviatura", "Ingrese la abreviatura de la asignatura si desea actualizarla.")
        .isLength({ min: 3, max: 6 }).withMessage("La abreviatura de la asignatura debe tener entre 3 y 6 caracteres.")
        .isAlphanumeric().withMessage("La abreviatura de la asignatura solo puede contener letras y números."),

    validarCampoOpcionalRequerido("promociona", "Indique si la asignatura pertenece a un área que promociona o no."),

    validarCampoOpcionalRequerido("porcentual", "Ingrese el peso porcentual de la asignatura si desea actualizarlo.")
        .isFloat({ min: 1, max: 100 })
        .withMessage("El peso porcentual debe estar entre 1 y 100."),

    validarCampoOpcionalRequerido("areaId", "Seleccione el área a la que pertenece la asignatura.")
        .isInt({ min: 1 })
        .withMessage("El identificador del área no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Area, "id", "el área seleccionada")),
]