import { body } from "express-validator";
import {
    validarCampoRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";

import { Estudiante } from "../models/estudiante.js";
import { Asignatura } from "../models/asignatura.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

/**
 * Validaciones para Crear/Actualizar Calificación
 * Nota: Al ser un "Upsert" (Guardar), usamos un solo validador principal.
 */
export const ValidarGuardarCalificacion = [
    // --- Identificadores Obligatorios ---

    validarCampoRequerido("estudianteId", "El estudiante es requerido.")
        .isInt().withMessage("El ID del estudiante debe ser un número entero.")
        .bail()
        .custom(verificarExistenciaPorId(Estudiante, "id", "el estudiante")),

    validarCampoRequerido("asignaturaId", "La asignatura es requerida.")
        .isInt().withMessage("El ID de la asignatura debe ser un número entero.")
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura")),

    validarCampoRequerido("periodo", "El periodo es requerido.")
        .isInt({ min: 1, max: 4 })
        .withMessage("El periodo debe ser un número entre 1 y 4."),

    // --- Notas (Opcionales pero validadas si vienen) ---
    // Usamos .optional({ nullable: true, checkFalsy: true }) para permitir vacíos o nulls

    body("notaAcademica")
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 1.0, max: 5.0 })
        .withMessage("La nota Académica debe estar entre 1.0 y 5.0"),

    body("notaAcumulativa")
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 1.0, max: 5.0 })
        .withMessage("La nota Acumulativa debe estar entre 1.0 y 5.0"),

    body("notaLaboral")
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 1.0, max: 5.0 })
        .withMessage("La nota Laboral debe estar entre 1.0 y 5.0"),

    body("notaSocial")
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 1.0, max: 5.0 })
        .withMessage("La nota Social debe estar entre 1.0 y 5.0"),

    // Caso especial: Nota Definitiva directa (Comportamiento)
    body("notaDefinitivaInput")
        .optional({ nullable: true, checkFalsy: true })
        .isFloat({ min: 1.0, max: 5.0 })
        .withMessage("La nota Definitiva debe estar entre 1.0 y 5.0"),

    // --- Otros campos ---
    body("fallas")
        .optional({ nullable: true })
        .isInt({ min: 0 })
        .withMessage("El número de inasistencias debe ser un entero positivo."),

    // Auditoría (Opcionales en estructura, obligatorios por lógica de negocio en Service)
    body("observacion_cambio").optional().isString(),
    body("url_evidencia_cambio").optional().isString(),

    // Middleware final de manejo de errores
    validationErrorHandler,
];