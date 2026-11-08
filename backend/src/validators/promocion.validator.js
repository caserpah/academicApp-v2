import { body } from "express-validator";
import { Matricula } from "../models/matricula.js";
import { verificarExistenciaPorId } from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

/**
 * Validador para el disparador del Motor de Promoción Masiva
 */
export const ValidarConfirmarPromocion = [
    // Validar que la lista sea un arreglo y no esté vacía
    body("listaAprobada")
        .isArray({ min: 1 }).withMessage("La lista de estudiantes a promocionar es requerida y no debe estar vacía."),

    // Validar cada objeto dentro del arreglo
    body("listaAprobada.*.matriculaId")
        .isInt({ min: 1 }).withMessage("ID de matrícula no válido.")
        .bail()
        .custom(verificarExistenciaPorId(Matricula, "id", "la matrícula")),

    // Validar el dictamen final
    body("listaAprobada.*.estadoFinal")
        .isIn(["PROMOVIDO", "REPROBADO"]).withMessage("El estado final debe ser PROMOVIDO o REPROBADO."),

    // Middleware final de manejo de errores
    validationErrorHandler,
];