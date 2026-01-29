import { body, param } from "express-validator";
import { Vigencia } from "../models/vigencia.js";
import {
    validarCampoUnico,
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";

import { validationErrorHandler } from "./validationErrorHandler.js";

/* ============================================================
    Helpers internos (DRY)
   ============================================================ */

/**
 * Obtiene el año lectivo de la solicitud.
 * Prioridades:
 *  1) req.body.anio
 *  2) req.query.anio
 *  3) Año almacenado en caché de request (req._vigenciaAnio)
 *  4) Buscar en BD por req.params.id y cachear en req._vigenciaAnio
 */
const obtenerAnioLectivo = async (req) => {
    if (req?.body?.anio) return Number(req.body.anio);
    if (req?.query?.anio) return Number(req.query.anio);
    if (req?._vigenciaAnio) return Number(req._vigenciaAnio);

    // Si es actualización y no enviaron el año, tomamos el del registro actual
    if (req?.params?.id) {
        const id = Number(req.params.id);
        if (!Number.isNaN(id) && id > 0) {
            const vigente = await Vigencia.findByPk(id);
            if (vigente) {
                req._vigenciaAnio = Number(vigente.anio); // cache
                return Number(vigente.anio);
            }
        }
    }
    return null; // no se pudo determinar
};

/**
 * Valida que una fecha pertenezca al año lectivo y (si es fin) que sea posterior a fechaInicio.
 * tipoFecha: "inicio" | "fin"
 */
const validarFechaDentroDelAnio = (tipoFecha) => {
    return async (value, { req }) => {
        // Campo opcional: si no viene, no valida (pero en create marcamos notEmpty aparte)
        if (!value) return true;

        const anio = await obtenerAnioLectivo(req);
        const fecha = new Date(value);
        const anioFecha = fecha.getUTCFullYear();

        if (anio && anioFecha !== anio) {
            const etiqueta = tipoFecha === "inicio" ? "de inicio" : "de finalización";
            throw new Error(`La fecha ${etiqueta} debe pertenecer al año lectivo ${anio}.`);
        }

        if (tipoFecha === "fin" && req.body?.fechaInicio) {
            const ini = new Date(req.body.fechaInicio);
            if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
                throw new Error("La fecha de finalización no es válida.");
            }
            if (!(ini instanceof Date) || Number.isNaN(ini.getTime())) {
                return true;
            }
            if (fecha <= ini) {
                throw new Error("La fecha de finalización debe ser posterior a la fecha de inicio.");
            }
        }

        return true;
    };
};

/**
 * Validaciones para el modelo Vigencia
 * ------------------------------------
 * Define las reglas usadas por express-validator
 * para crear o actualizar vigencias (años lectivos).
 */

export const validarCrearVigencia = [
    validarCampoRequerido("anio", "Ingrese el año lectivo.")
        .isInt({ min: 2025 }).withMessage("El año lectivo debe ser posterior a 2025.")
        .custom(validarCampoUnico(Vigencia, "anio", "un año lectivo", false, "El año lectivo ya se encuentra registrado. Por favor, intente con uno diferente.")),

    validarCampoRequerido("fechaInicio", "Ingrese la fecha en que inicia el año lectivo.")
        .isISO8601()
        .withMessage("La fecha de inicio del año lectivo debe tener un formato válido, por ejemplo: 2026-01-15.")
        .custom(validarFechaDentroDelAnio("inicio")),

    validarCampoRequerido("fechaFin", "Ingrese la fecha en que finaliza el año lectivo.")
        .isISO8601()
        .withMessage("La fecha de finalización del año lectivo debe tener un formato válido, por ejemplo: 2026-12-10.")
        .custom(validarFechaDentroDelAnio("fin")),

    body("activa")
        .optional()
        .isBoolean()
        .withMessage("El valor del campo 'activo' debe ser verdadero o falso."),

    validationErrorHandler,
];

export const validarActualizarVigencia = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El identificador del año lectivo no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Vigencia, "id", "el año lectivo")),

    validarCampoOpcionalRequerido("anio", "Ingrese el año lectivo.")
        .isInt({ min: 2025 }).withMessage("El año lectivo debe ser posterior a 2025.")
        .custom(validarCampoUnico(Vigencia, "anio", "un año lectivo", true, "El año lectivo ya se encuentra registrado. Por favor, intente con uno diferente.")), ,

    validarCampoOpcionalRequerido("anio", "Ingrese el año lectivo.")
        .isInt({ min: 2025 }).withMessage("El año lectivo debe ser posterior a 2025."),

    body("fechaInicio")
        .optional()
        .isISO8601()
        .withMessage("La fecha de inicio del año lectivo debe tener un formato válido, por ejemplo: 2026-01-15.")
        .custom(validarFechaDentroDelAnio("inicio")),

    body("fechaFin")
        .optional()
        .isISO8601()
        .withMessage("La fecha de finalización del año lectivo debe tener un formato válido, por ejemplo: 2026-12-10.")
        .custom(validarFechaDentroDelAnio("fin")),

    body("activa")
        .optional()
        .isBoolean()
        .withMessage("El valor del campo 'activo' debe ser verdadero o falso."),

    validationErrorHandler,
];