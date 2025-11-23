import { body, param } from "express-validator";
import { Area } from "../models/area.js";
import {
    validarCampoOpcionalRequerido,
    validarCampoRequerido,
    validarCampoUnico,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";

// Validar crear área
export const validarCrearArea = [
    validarCampoRequerido("codigo", "Ingrese el código del área.")
        .isLength({ min:3, max: 6 }).withMessage("El código del área debe tener entre 3 y 6 caracteres.")
        .isAlphanumeric().withMessage("El código del área solo puede contener letras y números.")
        .bail()
        .custom(validarCampoUnico(Area, "codigo", "un área", false, null, "el código")),

    validarCampoRequerido("nombre", "Ingrese el nombre del área.")
        .isLength({ min: 3, max: 60 })
        .withMessage("El nombre del área debe tener entre 3 y 60 caracteres.")
        .bail()
        .custom(validarCampoUnico(Area, "nombre", "un área", false, null, "el nombre")),

    validarCampoRequerido("abreviatura", "Ingrese la abreviatura del área.")
        .isLength({ min:3, max: 6 }).withMessage("La abreviatura del área debe tener entre 3 y 6 caracteres.")
        .isAlphanumeric().withMessage("La abreviatura del área solo puede contener letras y números."),

    body("promociona")
        .optional()
        .isBoolean()
        .withMessage("El valor del campo 'promociona' debe ser verdadero o falso."),
];

// Validar actualizar área
export const validarActualizarArea = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El área seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Area, "id", "el área solicitada")),

    validarCampoOpcionalRequerido("codigo", "Ingrese el código del área si desea actualizarlo.")
        .isLength({ min:3, max: 6 }).withMessage("El código del área debe tener entre 3 y 6 caracteres.")
        .isAlphanumeric().withMessage("El código del área solo puede contener letras y números.")
        .bail()
        .custom(validarCampoUnico(Area, "codigo", "un área", true, null, "el código")),

    validarCampoOpcionalRequerido("nombre", "Ingrese el nombre del área si desea actualizarlo.")
        .isLength({ min: 3, max: 60 })
        .withMessage("El nombre del área debe tener entre 3 y 60 caracteres.")
        .bail()
        .custom(validarCampoUnico(Area, "nombre", "un área", true, null, "el nombre")),

    validarCampoOpcionalRequerido("abreviatura", "Ingrese la abreviatura del área si desea actualizarla.")
        .isLength({ min:3, max: 6 }).withMessage("La abreviatura del área debe tener entre 3 y 6 caracteres.")
        .isAlphanumeric().withMessage("La abreviatura del área solo puede contener letras y números."),

    body("promociona")
        .optional()
        .isBoolean()
        .withMessage("El valor del campo 'promociona' debe ser verdadero o falso."),
]