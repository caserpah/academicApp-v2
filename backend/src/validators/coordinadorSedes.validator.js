import { body, param } from "express-validator";
import { Coordinador } from "../models/coordinador.js";
import { Sede } from "../models/sede.js";
import { CoordinadorSedes } from "../models/coordinador_sedes.js";
import {
    validarCampoRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

const JORNADAS = ["MANANA", "TARDE", "NOCHE", "UNICA"];

export const validarCrearCoordinadorSede = [
    validarCampoRequerido("coordinadorId", "Seleccione un coordinador.")
        .isInt({ min: 1 }).withMessage("El coordinador seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Coordinador, "id", "el coordinador")),

    validarCampoRequerido("sedeId", "Seleccione una sede.")
        .isInt({ min: 1 }).withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Sede, "id", "la sede")),

    validarCampoRequerido("jornada", "Seleccione la jornada.")
        .isIn(JORNADAS)
        .withMessage("La jornada seleccionada no es válida."),

    validationErrorHandler,
];

export const validarActualizarCoordinadorSede = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("La asignación de sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(CoordinadorSedes, "id", "la asignación de coordinador en sede")),

    body("jornada")
        .optional()
        .isIn(JORNADAS)
        .withMessage("La jornada seleccionada no es válida."),

    validationErrorHandler,
];