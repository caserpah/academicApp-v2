import { param } from "express-validator";
import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";
import { Desempeno } from "../models/desempeno.js";
import { DesempenoRango } from "../models/desempeno_rango.js";

export const validarCrearRango = [
    validarCampoRequerido("desempenoId", "Seleccione el desempeño.")
        .isInt({ min: 1 })
        .withMessage("El desempeño seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Desempeno, "id", "el desempeño")),

    validarCampoRequerido("minNota", "Especifique la nota mínima.")
        .isFloat({ min: 0, max: 5 })
        .withMessage("La nota mínima debe estar entre 0.00 y 5.00."),

    validarCampoRequerido("maxNota", "Especifique la nota máxima.")
        .isFloat({ min: 0, max: 5 })
        .withMessage("La nota máxima debe estar entre 0.00 y 5.00.")
        .bail()
        .custom((value, { req }) => {
            const min = parseFloat(req.body.minNota);
            const max = parseFloat(value);
            if (!isNaN(min) && !isNaN(max) && min > max) {
                throw new Error("La nota mínima no puede ser mayor que la nota máxima.");
            }
            return true;
        }),
];

export const validarActualizarRango = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El rango seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(DesempenoRango, "id", "el rango")),

    validarCampoOpcionalRequerido("desempenoId", "Seleccione el desempeño.")
        .isInt({ min: 1 })
        .withMessage("El desempeño seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Desempeno, "id", "el desempeño")),

    validarCampoOpcionalRequerido("minNota", "Especifique la nota mínima.")
        .isFloat({ min: 0, max: 5 })
        .withMessage("La nota mínima debe estar entre 0.00 y 5.00."),

    validarCampoOpcionalRequerido("maxNota", "Especifique la nota máxima.")
        .isFloat({ min: 0, max: 5 })
        .withMessage("La nota máxima debe estar entre 0.00 y 5.00.")
        .bail()
        .custom((value, { req }) => {
            const min = req.body.minNota !== undefined ? parseFloat(req.body.minNota) : null;
            const max = value !== undefined ? parseFloat(value) : null;

            if (min !== null && max !== null && min > max) {
                throw new Error("La nota mínima no puede ser mayor que la nota máxima.");
            }
            return true;
        }),
];