import { param } from "express-validator";
import { Carga } from "../models/carga.js";
import { Docente } from "../models/docente.js";
import { Grupo } from "../models/grupo.js";
import { Sede } from "../models/sede.js";
import { Asignatura } from "../models/asignatura.js";
import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

// Horas permitidas: 1 a 40
const HORAS_MIN = 1;
const HORAS_MAX = 40;

export const validarCrearCarga = [
    validarCampoRequerido("horas", "Ingrese la cantidad de horas asignadas.")
        .isInt({ min: HORAS_MIN, max: HORAS_MAX })
        .withMessage(`Las horas deben estar entre ${HORAS_MIN} y ${HORAS_MAX}.`),

    validarCampoRequerido("sedeId", "Seleccione la sede.")
        .isInt({ min: 1 })
        .withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Sede, "id", "la sede seleccionada")),

    validarCampoRequerido("docenteId", "Seleccione el docente.")
        .isInt({ min: 1 })
        .withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Docente, "id", "el docente seleccionado")),

    validarCampoRequerido("grupoId", "Seleccione el grupo.")
        .isInt({ min: 1 })
        .withMessage("El grupo seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grupo, "id", "el grupo seleccionado")),

    validarCampoRequerido("asignaturaId", "Seleccione la asignatura.")
        .isInt({ min: 1 })
        .withMessage("La asignatura seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura seleccionada")),

    validationErrorHandler,
];

export const validarActualizarCarga = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("La carga seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Carga, "id", "la carga")),

    validarCampoOpcionalRequerido("horas", "Ingrese la cantidad de horas asignadas.")
        .isInt({ min: HORAS_MIN, max: HORAS_MAX })
        .withMessage(`Las horas deben estar entre ${HORAS_MIN} y ${HORAS_MAX}.`),

    validarCampoOpcionalRequerido("sedeId", "Seleccione la sede.")
        .isInt({ min: 1 })
        .withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Sede, "id", "la sede seleccionada")),

    validarCampoOpcionalRequerido("docenteId", "Seleccione el docente.")
        .isInt({ min: 1 })
        .withMessage("El docente seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Docente, "id", "el docente seleccionado")),

    validarCampoOpcionalRequerido("grupoId", "Seleccione el grupo.")
        .isInt({ min: 1 })
        .withMessage("El grupo seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grupo, "id", "el grupo seleccionado")),

    validarCampoOpcionalRequerido("asignaturaId", "Seleccione la asignatura.")
        .isInt({ min: 1 })
        .withMessage("La asignatura seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura seleccionada")),

    validationErrorHandler,
];