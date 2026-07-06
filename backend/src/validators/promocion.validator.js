import { body } from "express-validator";
import { Matricula } from "../models/matricula.js";
import { Grado } from "../models/grado.js";
import { Vigencia } from "../models/vigencia.js";
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
    body("listaAprobada.*.matriculaViejaId")
        .isInt({ min: 1 }).withMessage("ID de matrícula original no válido.")
        .bail()
        .custom(verificarExistenciaPorId(Matricula, "id", "la matrícula original")),

    body("listaAprobada.*.estadoFinal")
        .isIn(["PROMOVIDO", "REPROBADO"]).withMessage("El estado final debe ser PROMOVIDO o REPROBADO."),

    // Los campos de destino solo son requeridos si el estudiante es PROMOVIDO o REPROBADO y tiene destino
    body("listaAprobada.*.gradoDestinoId")
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage("Grado destino no válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado destino")),

    body("listaAprobada.*.vigenciaDestinoId")
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage("Vigencia destino no válida.")
        .bail()
        .custom(verificarExistenciaPorId(Vigencia, "id", "la vigencia destino")),

    // Middleware final de manejo de errores
    validationErrorHandler,
];