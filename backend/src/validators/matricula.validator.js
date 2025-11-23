import { body, param } from "express-validator";
import { Estudiante } from "../models/estudiante.js";
import { Grupo } from "../models/grupo.js";
import { Vigencia } from "../models/vigencia.js";
import { Sede } from "../models/sede.js";
import { Matricula } from "../models/matricula.js";
import {
    validarCampoUnico,
    verificarExistenciaPorCampo,
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
} from "../utils/dbUtils.js";
import { validationErrorHandler } from "./validationErrorHandler.js";

/* -----------------------------------------------------------
 * CONFIGURACIONES GLOBALES
 * ----------------------------------------------------------- */
const SITUACIONES_PERMITIDAS = ["NV", "AP", "RP", "NC"];
const TIPOS_PERMITIDOS = ["PREMATRICULA", "MATRICULA"];

const validarBooleanoOpcional = (campo, etiqueta) =>
    body(campo)
        .optional({ checkFalsy: true })
        .isBoolean()
        .withMessage(`${etiqueta} debe ser verdadero o falso.`)
        .toBoolean();

/* -----------------------------------------------------------
 * CREAR MATRÍCULA / PREMATRÍCULA (individual)
 * ----------------------------------------------------------- */
export const validarCrearMatricula = [
    validarCampoRequerido("folio", "Ingrese el número de folio.")
        .isLength({ max: 20 }).withMessage("El número de folio no debe exceder los 20 caracteres.")
        .bail()
        .custom(validarCampoUnico(Matricula, "folio", false, null, "Folio")),

    validarCampoRequerido("estudianteId", "Seleccione un estudiante.")
        .isInt({ min: 1 }).withMessage("El estudiante seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Estudiante, "id", "el estudiante", "ID")),

    validarCampoRequerido("grupoId", "Seleccione un grupo.")
        .isInt({ min: 1 }).withMessage("El grupo seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Grupo, "id", "el grupo", "ID")),

    validarCampoRequerido("sedeId", "Seleccione la sede donde se registra la matrícula.")
        .isInt({ min: 1 }).withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorCampo(Sede, "id", "la sede", "ID")),

    validarCampoRequerido("metodologia", "Seleccione una metodología de estudio.")
        .isLength({ max: 20 })
        .withMessage("El nombre de la metodología no debe exceder los 20 caracteres."),

    // tipo (si no viene, el modelo pone MATRÍCULA por defecto)
    body("tipo")
        .optional({ checkFalsy: true })
        .isIn(TIPOS_PERMITIDOS)
        .withMessage("Indique si el registro corresponde a una matrícula o una prematrícula."),

    // Validación de vigencia destino solo para PREMATRÍCULA
    body("vigenciaDestinoId")
        .custom(async (value, { req }) => {
            if ((req.body.tipo || "MATRICULA") === "PREMATRICULA") {
                if (!value) throw new Error("Seleccione el año lectivo de destino para la prematrícula.");

                const vigente = req.vigenciaActual?.id;
                if (vigente && Number(value) <= vigente) {
                    throw new Error("El año lectivo de destino para la prematrícula no es válido.");
                }

                await verificarExistenciaPorCampo(Vigencia, "id", "el año lectivo de destino", "ID")(value);
            }
            return true;
        }),

    // campos de control
    validarBooleanoOpcional("repitente", "Repitente"),
    validarBooleanoOpcional("nuevo", "Nuevo"),
    validarBooleanoOpcional("activo", "Activo"),
    validarBooleanoOpcional("confirmada", "Confirmada"),

    // enums / strings
    validarCampoRequerido("situacion", "Seleccione la situación académica del estudiante.")
        .isIn(SITUACIONES_PERMITIDAS)
        .withMessage("La situación académica debe ser NV, AP, RP o NC."),

    body("observaciones")
        .optional({ checkFalsy: true })
        .isLength({ max: 1000 })
        .withMessage("Las observaciones no deben exceder los 1000 caracteres."),

    validationErrorHandler,
];

/* -----------------------------------------------------------
 * ACTUALIZAR MATRÍCULA / PREMATRÍCULA
 * ----------------------------------------------------------- */
export const validarActualizarMatricula = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El identificador de la matrícula no es válido."),

    // folio (único, ignorando registro actual)
    validarCampoOpcionalRequerido("folio", "Ingrese el número de folio si desea actualizarlo.")
        .isLength({ max: 20 }).withMessage("El número de folio no debe exceder los 20 caracteres.")
        .bail()
        .custom(validarCampoUnico(Matricula, "folio", true, null, "Folio")),

    // llaves foráneas (opcionales)
    body("estudianteId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El estudiante seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Estudiante, "id", "el estudiante", "ID")),

    body("grupoId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El grupo seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Grupo, "id", "el grupo", "ID")),

    body("sedeId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("La sede seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorCampo(Sede, "id", "la sede", "ID")),

    body("tipo")
        .optional({ checkFalsy: true })
        .isIn(TIPOS_PERMITIDOS)
        .withMessage("Indique si el registro corresponde a una matrícula o una prematrícula."),

    // si se manda vigenciaDestinoId, verificar y existir
    body("vigenciaDestinoId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("Seleccione un año lectivo de destino válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Vigencia, "id", "el año lectivo de destino", "ID")),

    // booleans opcionales
    validarBooleanoOpcional("repitente", "Repitente"),
    validarBooleanoOpcional("nuevo", "Nuevo"),
    validarBooleanoOpcional("activo", "Activo"),
    validarBooleanoOpcional("confirmada", "Confirmada"),


    // enums / strings
    body("situacion")
        .optional({ checkFalsy: true })
        .isIn(SITUACIONES_PERMITIDAS)
        .withMessage("Seleccione una situación académica válida: NV, AP, RP o NC."),

    body("metodologia")
        .optional({ checkFalsy: true })
        .isLength({ max: 20 })
        .withMessage("El nombre de la metodología no debe exceder los 20 caracteres."),

    body("observaciones")
        .optional({ checkFalsy: true })
        .isLength({ max: 1000 })
        .withMessage("Las observaciones no deben exceder los 1000 caracteres."),

    validationErrorHandler,
];

/* -----------------------------------------------------------
 * PREMATRÍCULA (individual)
 * ----------------------------------------------------------- */
export const validarPrematricula = [
    validarCampoRequerido("estudianteId", "Seleccione un estudiante.")
        .isInt({ min: 1 }).withMessage("El estudiante seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Estudiante, "id", "el estudiante", "ID")),

    validarCampoRequerido("grupoId", "Seleccione un grupo.")
        .isInt({ min: 1 }).withMessage("El grupo seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Grupo, "id", "el grupo", "ID")),

    validarCampoRequerido("vigenciaDestinoId", "Seleccione un año lectivo de destino.")
        .isInt({ min: 1 }).withMessage("El año lectivo de destino seleccionado no es válido.")
        .bail()
        .custom(async (value, { req }) => {
            const vigente = req.vigenciaActual?.id;
            if (vigente && Number(value) <= vigente) {
                throw new Error("El año lectivo de destino debe ser posterior al año lectivo actual.");
            }
            await verificarExistenciaPorCampo(Vigencia, "id", "el año lectivo de destino", "ID")(value);
            return true;
        }),

    validationErrorHandler,
];

/* -----------------------------------------------------------
 * CONFIRMAR PREMATRÍCULA (individual)
 * ----------------------------------------------------------- */
export const validarConfirmacion = [
    param("id").isInt({ min: 1 }).withMessage("El registro seleccionado no es válido."),
    validationErrorHandler,
];

/* -----------------------------------------------------------
 * CONFIRMAR PREMATRÍCULAS (MASIVO)
 * ----------------------------------------------------------- */
export const validarConfirmacionMasiva = [
    body().custom((value) => {
        const hasLista = Array.isArray(value?.ids) && value.ids.length > 0;
        const hasGrupo = Number.isInteger(Number(value?.grupoId)) && Number(value?.grupoId) > 0;

        if (!hasLista && !hasGrupo) {
            throw new Error("Seleccione un grupo o una lista de estudiantes para confirmar las prematrículas.");
        }

        if (hasLista && !value.ids.every((v) => Number.isInteger(Number(v)) && Number(v) > 0)) {
            throw new Error("La lista de estudiantes contiene identificadores no válidos.");
        }

        return true;
    }),
    validationErrorHandler,
];

/* -----------------------------------------------------------
 * GENERAR PREMATRÍCULAS (MASIVO)
 * ----------------------------------------------------------- */
export const validarGeneracionMasivaPrematricula = [
    validarCampoRequerido("vigenciaDestinoId", "Seleccione el año lectivo de destino.")
        .isInt({ min: 1 }).withMessage("El año lectivo de destino seleccionado no es válido.")
        .bail()
        .custom(async (value, { req }) => {
            const vigente = req.vigenciaActual?.id;
            if (vigente && Number(value) <= vigente) {
                throw new Error("El año lectivo de destino debe ser posterior al año lectivo actual.");
            }
            await verificarExistenciaPorCampo(Vigencia, "id", "el año lectivo de destino", "ID")(value);
            return true;
        }),

    body("grupoId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("Seleccione un grupo válido.")
        .bail()
        .custom(verificarExistenciaPorCampo(Grupo, "id", "el grupo", "ID")),

    body("sedeId")
        .optional({ checkFalsy: true })
        .isInt({ min: 1 }).withMessage("Seleccione una sede válida.")
        .bail()
        .custom(verificarExistenciaPorCampo(Sede, "id", "la sede", "ID")),

    validationErrorHandler,
];

/* -----------------------------------------------------------
 * EXISTENCIA GENÉRICA POR ID
 * ----------------------------------------------------------- */
export const validarMatriculaExistente = [
    param("id").isInt({ min: 1 }).withMessage("El registro seleccionado no es válido."),
    validationErrorHandler,
];