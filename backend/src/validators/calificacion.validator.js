import { body, query } from "express-validator";
import { Estudiante } from "../models/estudiante.js";
import { Asignatura } from "../models/asignatura.js";
import { Grupo } from "../models/grupo.js";
import { validarCampoRequerido, verificarExistenciaPorCampo } from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

const rangoNota = (campo) =>
    body(campo)
        .isFloat({ min: 0, max: 5 }).withMessage("Ingrese una nota entre 0.0 y 5.0.");

const camposNotas = [
    rangoNota("notaAcademica"),
    rangoNota("notaAcumulativa"),
    rangoNota("notaLaboral"),
    rangoNota("notaSocial"),
];

const camposJuicios = [
    body("juicioAcademica").optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage("El juicio académico no debe exceder 2000 caracteres."),
    body("juicioAcumulativa").optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage("El juicio acumulativo no debe exceder 2000 caracteres."),
    body("juicioLaboral").optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage("El juicio laboral no debe exceder 2000 caracteres."),
    body("juicioSocial").optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage("El juicio social no debe exceder 2000 caracteres."),
];

export const validarUpsertIndividual = [
    validarCampoRequerido("periodo", "Seleccione el periodo.")
        .isInt({ min: 1, max: 4 }).withMessage("El periodo debe estar entre 1 y 4."),
    validarCampoRequerido("estudianteId", "Seleccione el estudiante.")
        .isInt({ min: 1 }).withMessage("El estudiante seleccionado no es válido.")
        .bail().custom(verificarExistenciaPorCampo(Estudiante, "id", "el estudiante", "ID")),
    validarCampoRequerido("asignaturaId", "Seleccione la asignatura.")
        .isInt({ min: 1 }).withMessage("La asignatura seleccionada no es válida.")
        .bail().custom(verificarExistenciaPorCampo(Asignatura, "id", "la asignatura", "ID")),
    ...camposNotas,
    ...camposJuicios,
    body("recomendacionUno").optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage("La recomendación no debe exceder 2000 caracteres."),
    body("recomendacionDos").optional({ checkFalsy: true }).isLength({ max: 2000 }).withMessage("La recomendación no debe exceder 2000 caracteres."),
    body("fallas").optional({ checkFalsy: true }).isInt({ min: 0, max: 400 }).withMessage("Las fallas deben estar entre 0 y 400."),
    validationErrorHandler,
];

export const validarPrecargaGrupo = [
    query("grupoId").isInt({ min: 1 }).withMessage("Seleccione un grupo válido."),
    query("asignaturaId").isInt({ min: 1 }).withMessage("Seleccione una asignatura válida."),
    query("periodo").isInt({ min: 1, max: 4 }).withMessage("El periodo debe estar entre 1 y 4."),
    query("valorBase").optional({ checkFalsy: true }).isFloat({ min: 0, max: 5 }).withMessage("El valor base debe estar entre 0.0 y 5.0."),
    validationErrorHandler,
];

export const validarUpsertMasivo = [
    validarCampoRequerido("grupoId", "Seleccione un grupo.")
        .isInt({ min: 1 }).withMessage("Seleccione un grupo válido.")
        .bail().custom(verificarExistenciaPorCampo(Grupo, "id", "el grupo", "ID")),
    validarCampoRequerido("asignaturaId", "Seleccione una asignatura.")
        .isInt({ min: 1 }).withMessage("Seleccione una asignatura válida.")
        .bail().custom(verificarExistenciaPorCampo(Asignatura, "id", "la asignatura", "ID")),
    validarCampoRequerido("periodo", "Seleccione el periodo.")
        .isInt({ min: 1, max: 4 }).withMessage("El periodo debe estar entre 1 y 4."),
    body("filas").isArray({ min: 1 }).withMessage("Cargue al menos un estudiante para registrar calificaciones."),
    // Valida notas y campos por cada fila (light validation)
    validationErrorHandler,
];

export const validarDescargarPlantilla = [
    query("grupoId").isInt({ min: 1 }).withMessage("Seleccione un grupo válido."),
    query("asignaturaId").isInt({ min: 1 }).withMessage("Seleccione una asignatura válida."),
    query("periodo").isInt({ min: 1, max: 4 }).withMessage("El periodo debe estar entre 1 y 4."),
    validationErrorHandler,
];

export const validarImportarExcel = [
    validarCampoRequerido("grupoId", "Seleccione un grupo.").isInt({ min: 1 }),
    validarCampoRequerido("asignaturaId", "Seleccione una asignatura.").isInt({ min: 1 }),
    validarCampoRequerido("periodo", "Seleccione el periodo.").isInt({ min: 1, max: 4 }),
    validationErrorHandler,
];