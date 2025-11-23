import { param } from "express-validator";
import { Indicador } from "../models/indicador.js";
import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";

// Validar crear área
export const validarCrearIndicador = [

    validarCampoRequerido("periodo", "Seleccione el periodo académico.")
        .isNumeric().withMessage("El valor ingresado para el periodo académico no es valido.")
        .isInt({ min: 1, max: 4 }).withMessage("El periodo debe estar entre 1 y 4."),

    validarCampoRequerido("descripcion", "Debe ingresar una descripción para el indicador")
        .isLength({ min: 5 }).withMessage("La descripción del indicador debe tener al menos 5 caracteres."),
];

export const validarActualizarIndicador = [

    param("id")
        .isInt({ min: 1 })
        .withMessage("El indicador seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Indicador, "id", "el indicador solicitado")),

    validarCampoOpcionalRequerido("periodo", "Seleccione el periodo académico.")
        .isNumeric().withMessage("El valor ingresado para el periodo académico no es valido.")
        .isInt({ min: 1, max: 4 }).withMessage("El periodo debe estar entre 1 y 4."),

    validarCampoOpcionalRequerido("descripcion", "Ingrese la descripción del indicador si desea actualizarlo")
        .isLength({ min: 5 }).withMessage("La descripción del indicador debe tener al menos 5 caracteres.")
];