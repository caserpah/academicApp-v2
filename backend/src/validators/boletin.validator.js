import {
    validarCampoRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";

import { Grupo } from "../models/grupo.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

/**
 * Validaciones para la generación por Lote de Boletines
 */
export const ValidarGenerarBoletinesLote = [

    // --- Identificadores Obligatorios ---
    validarCampoRequerido("grupoId", "El grupo es requerido.")
        .isInt().withMessage("El grupo seleccionado no es válido.")
        .toInt()
        .bail()
        .custom(verificarExistenciaPorId(Grupo, "id", "el grupo")),

    // --- Parámetros de Generación ---
    validarCampoRequerido("periodoActual", "El periodo actual es requerido.")
        .isInt({ min: 1, max: 5 })
        .toInt()
        .withMessage("El periodo debe ser un número entero entre 1 y 5."),

    validarCampoRequerido("tipoBoletin", "El tipo de boletín es requerido.")
        .isString()
        .isIn(['VALORATIVO', 'DESCRIPTIVO'])
        .withMessage("El tipo de boletín debe ser exactamente 'VALORATIVO' o 'DESCRIPTIVO'."),

    // Middleware final de manejo de errores
    validationErrorHandler,
];