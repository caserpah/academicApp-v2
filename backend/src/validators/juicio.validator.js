import { body, param } from "express-validator";
import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";

import { Grado } from "../models/grado.js";
import { Dimension } from "../models/dimension.js";
import { Desempeno } from "../models/desempeno.js";
import { Asignatura } from "../models/asignatura.js";
import { Juicio } from "../models/juicio.js";
import { ConfigGrado } from "../models/config_grado.js";

/**
 * Helper: Normalizar texto para comparaciones
 */
const normalizar = (texto) => texto ? texto.trim().toUpperCase() : "";

/**
 * Helper: identificar asignatura COMPORTAMIENTO
 */
const esAsignaturaComportamiento = (asignatura) => {
    const nombre = normalizar(asignatura?.nombre);
    return nombre === "COMPORTAMIENTO";
};

/**
 * Helper: identificar Grado PREESCOLAR
 * PRE_JARDIN, JARDIN, TRANSICION
 */
const esGradoPreescolar = (grado) => {
    const nombre = normalizar(grado?.nombre);
    const gradosPreescolar = ["PRE_JARDIN", "PRE JARDIN", "JARDIN", "TRANSICION", "TRANSICIÓN"];
    return gradosPreescolar.includes(nombre);
};

async function obtenerConfigGrado(gradoId) {
    const grado = await Grado.findByPk(gradoId, {
        include: [{
            model: ConfigGrado,
            as: "configuracion"
        }],
    });

    if (!grado) throw new Error("El grado seleccionado no existe.");

    // Si no hay configuración, devolvemos un objeto vacío seguro para evitar crashes
    return { grado, config: grado.configuracion || {} };
}

// Validar crear juicio
export const ValidarCrearJuicio = [
    validarCampoRequerido("gradoId", "Seleccione el grado.")
        .isInt({ min: 1 }).bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado")),

    validarCampoRequerido("asignaturaId", "Seleccione la asignatura.")
        .isInt({ min: 1 }).bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura")),

    validarCampoRequerido("periodo", "Seleccione el periodo académico.")
        .isInt({ min: 1, max: 4 }).bail()
        .custom(async (value, { req }) => {
            const gradoId = req.body.gradoId;
            if (!gradoId) return true;
            const { config } = await obtenerConfigGrado(gradoId);
            const permitidos = config.periodosPermitidos || [];
            // Si no hay configuración de periodos, asumimos que todos están permitidos o lanzamos error.
            if (permitidos.length > 0 && !permitidos.includes(Number(value))) {
                throw new Error(`Periodos permitidos: ${permitidos.join(", ")}.`);
            }
            return true;
        }),

    validarCampoRequerido("texto", "Ingrese la descripción del juicio.")
        .isLength({ min: 10 })
        .withMessage("La descripción del juicio debe tener mínimo 10 caracteres."),

    body("dimensionId")
        .custom(async (value, { req }) => {
            const asignaturaId = req.body.asignaturaId;
            // Si no hay asignatura, dejamos que falle la validación de asignaturaId
            if (!asignaturaId) return true;

            const asignatura = await Asignatura.findByPk(asignaturaId);
            if (!asignatura) return true; // Se valida arriba

            const idDimension = Number(value);

            // Asignatura COMPORTAMIENTO
            if (esAsignaturaComportamiento(asignatura)) {
                if (idDimension !== 999) {
                    throw new Error("El Comportamiento debe ir asociada a SIN DIMENSION.");
                }
                return true;
            }

            // Cualquier asignatura que NO sea COMPORTAMIENTO
            if (idDimension === 999) {
                throw new Error("Esta asignatura no puede usarse sin dimensión. Seleccione una dimensión válida (Académica, Social, laboral, etc.).");
            }

            // Validamos que sea un ID válido y exista en BD
            if (!value || idDimension <= 0) {
                throw new Error("Seleccione una dimensión válida.");
            }

            const dimension = await Dimension.findByPk(idDimension);
            if (!dimension) throw new Error("La dimensión seleccionada no existe.");

            return true;
        }),

    validarCampoRequerido("desempenoId", "Seleccione el indicador de desempeño.")
        .isInt({ min: 1 }).bail()
        .custom(async (desempenoId, { req }) => {
            const { gradoId, asignaturaId, dimensionId } = req.body;
            if (!gradoId || !asignaturaId) return true;

            // Buscar el indicador de desempeño
            const desempeno = await Desempeno.findByPk(desempenoId);
            if (!desempeno) throw new Error("El indicador de desempeño seleccionado no existe.");

            const asignatura = await Asignatura.findByPk(asignaturaId);
            const grado = await Grado.findByPk(gradoId); // Necesitamos el nombre del grado

            let esAcumulativa = false;
            // Solo buscamos si la dimensionId es válida y diferente de 999 (SIN DIMENSION)
            if (dimensionId && Number(dimensionId) !== 999) {
                const dimension = await Dimension.findByPk(dimensionId);
                if (dimension && normalizar(dimension.nombre) === "ACUMULATIVA") {
                    esAcumulativa = true;
                }
            }

            // --- EVALUACIÓN DE REGLAS ---
            const esPreescolar = esGradoPreescolar(grado);
            const esComportamiento = esAsignaturaComportamiento(asignatura);

            // ¿Debe usar escala múltiple (Bajo, Básico, Alto, Superior)?
            // SE CUMPLE SI: Es Preescolar O Es Comportamiento O Es Dimensión Acumulativa
            const debeUsarEscalaMultiple = esPreescolar || esComportamiento || esAcumulativa;

            const nombreDesempeno = normalizar(desempeno.nombre);
            const escalaMultiple = ["BAJO", "BASICO", "ALTO", "SUPERIOR"];

            if (debeUsarEscalaMultiple) {
                // Caso: Preescolar, Comportamiento o Acumulativa
                if (!escalaMultiple.includes(nombreDesempeno)) {
                    throw new Error("El indicador de desempeño debe ser: BAJO, BÁSICO, ALTO o SUPERIOR.");
                }
            } else {
                if (nombreDesempeno !== "UNICO") {
                    throw new Error("El indicador de desempeño debe ser UNICO.");
                }
            }

            return true;
        }),

    body("activo").optional().isBoolean(),
];

// Validar actualizar juicio
export const validarActualizarJuicio = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El juicio seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Juicio, "id", "el juicio")),

    validarCampoOpcionalRequerido("gradoId", "Seleccione el grado.")
        .isInt({ min: 1 }).bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado")),

    validarCampoOpcionalRequerido("asignaturaId", "Seleccione la asignatura.")
        .isInt({ min: 1 }).bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura")),

    validarCampoOpcionalRequerido("periodo", "Seleccione el periodo académico.")
        .isInt({ min: 1, max: 4 }).bail()
        .custom(async (value, { req }) => {
            const gradoId = req.body.gradoId;
            if (!gradoId) return true;
            const { config } = await obtenerConfigGrado(gradoId);
            const permitidos = config.periodosPermitidos || [];
            // Si no hay configuración de periodos, asumimos que todos están permitidos o lanzamos error.
            if (permitidos.length > 0 && !permitidos.includes(Number(value))) {
                throw new Error(`Periodos permitidos: ${permitidos.join(", ")}.`);
            }
            return true;
        }),

    validarCampoOpcionalRequerido("texto", "Ingrese la descripción del juicio.")
        .isLength({ min: 10 })
        .withMessage("La descripción del juicio debe tener mínimo 10 caracteres."),

    body("dimensionId")
        .optional()
        .custom(async (value, { req }) => {
            // Obtenemos datos combinados (Actual vs Nuevo)
            const juicio = await Juicio.findByPk(req.params.id);
            if (!juicio) return true; // Validado arriba

            const asignaturaId = req.body.asignaturaId ?? juicio.asignaturaId;
            const asignatura = await Asignatura.findByPk(asignaturaId);

            if (!asignatura) return true;

            const idDimension = Number(value);

            // La asignatura es COMPORTAMIENTO
            if (esAsignaturaComportamiento(asignatura)) {
                if (idDimension !== 999) {
                    throw new Error("El Comportamiento debe ir asociada a SIN DIMENSION.");
                }
                return true;
            }

            // La asignatura NO es COMPORTAMIENTO
            if (idDimension === 999) {
                throw new Error("No puede asignar SIN DIMENSION a esta asignatura.");
            }

            if (idDimension <= 0) {
                throw new Error("Dimensión inválida.");
            }

            const dimension = await Dimension.findByPk(idDimension);
            if (!dimension) throw new Error("La dimensión no existe.");

            return true;
        }),

    body("desempenoId")
        .optional()
        .isInt({ min: 1 }).bail()
        .custom(async (desempenoId, { req }) => {
            if (!desempenoId) return true;

            // Obtener el juicio actual para completar datos faltantes
            const juicio = await Juicio.findByPk(req.params.id);
            if (!juicio) return true;

            // Datos combinados (Lo que viene en body o lo que ya existe)
            const gradoId = req.body.gradoId ?? juicio.gradoId;
            const asignaturaId = req.body.asignaturaId ?? juicio.asignaturaId;
            const dimensionId = req.body.dimensionId ?? juicio.dimensionId;

            const desempeno = await Desempeno.findByPk(desempenoId);
            if (!desempeno) throw new Error("El indicador de desempeño no existe.");

            const grado = await Grado.findByPk(gradoId);
            const asignatura = await Asignatura.findByPk(asignaturaId);

            let esAcumulativa = false;
            // Solo buscamos si la dimensionId es válida y diferente de 999 (SIN DIMENSION)
            if (dimensionId && Number(dimensionId) !== 999) {
                const dimension = await Dimension.findByPk(dimensionId);
                if (dimension && normalizar(dimension.nombre) === "ACUMULATIVA") {
                    esAcumulativa = true;
                }
            }

            // --- REGLAS ---
            const esPreescolar = esGradoPreescolar(grado);
            const esComportamiento = esAsignaturaComportamiento(asignatura);
            const debeUsarEscalaMultiple = esPreescolar || esComportamiento || esAcumulativa;

            const nombreDesempeno = normalizar(desempeno.nombre);
            const escalaMultiple = ["BAJO", "BASICO", "ALTO", "SUPERIOR"];

            if (debeUsarEscalaMultiple) {
                if (!escalaMultiple.includes(nombreDesempeno)) {
                    throw new Error("El indicador de desempeño debe ser: BAJO, BÁSICO, ALTO o SUPERIOR.");
                }
            } else {
                if (nombreDesempeno !== "UNICO") {
                    throw new Error("El indicador de desempeño debe ser UNICO.");
                }
            }

            return true;
        }),
];