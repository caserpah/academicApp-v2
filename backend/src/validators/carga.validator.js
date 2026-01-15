import { body, param } from "express-validator";
import { Sede } from "../models/sede.js";
import { Docente } from "../models/docente.js";
import { Grupo } from "../models/grupo.js";
import { Asignatura } from "../models/asignatura.js";
import { Vigencia } from "../models/vigencia.js";
import { Carga } from "../models/carga.js";
import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

export const validarCrearCarga = [
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

    body("vigenciaId").optional().isInt().custom(verificarExistenciaPorId(Vigencia, "id", "el año lectivo o vigencia")),

    validarCampoRequerido("horas", "Ingrese la intensidad horaria.")
        .isInt({ min: 0 }).withMessage("Las horas deben ser un número mayor cero."),

    validationErrorHandler,
];

export const validarActualizarCarga = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("La carga seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Carga, "id", "la carga")),

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

    validarCampoOpcionalRequerido("horas", "Ingrese la intensidad horaria.")
        .isInt({ min: 0 }).withMessage("Las horas deben ser un número mayor cero."),

    validationErrorHandler,
];