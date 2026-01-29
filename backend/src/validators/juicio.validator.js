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
import { validationErrorHandler } from "./validationErrorHandler.js";

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
    if (!grado) return false; // Si es Global (grado null), NO es preescolar
    const nombre = normalizar(grado?.nombre);
    const gradosPreescolar = ["PRE_JARDIN", "PRE JARDIN", "JARDIN", "TRANSICION", "TRANSICIÓN"];
    return gradosPreescolar.includes(nombre);
};

// Helper para obtener config, si el grado es null devuelve objeto vacío
async function obtenerConfigGrado(gradoId) {
    if (!gradoId) return { config: {} }; // Sin grado, sin config específica

    const grado = await Grado.findByPk(gradoId, {
        include: [{
            model: ConfigGrado,
            as: "configuracion"
        }],
    });

    // Si envían un ID pero no existe, dejamos que falle la validación de existencia abajo
    if (!grado) return { grado: null, config: {} };

    return { grado, config: grado.configuracion || {} };
}

// Validar crear juicio
export const ValidarCrearJuicio = [
    body("gradoId")
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El grado seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado")),

    body("asignaturaId")
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1 }).withMessage("La asignatura seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura")),

    validarCampoRequerido("periodo", "Seleccione el periodo académico.")
        .isInt({ min: 1, max: 4 }).bail()
        .custom(async (value, { req }) => {
            const gradoId = req.body.gradoId;
            if (!gradoId) return true; // Si es global, permitimos cualquier periodo (1-4)

            const { config } = await obtenerConfigGrado(gradoId);
            const permitidos = config.periodosPermitidos || [];
            // Si no hay configuración de periodos, asumimos que todos están permitidos o lanzamos error.
            if (permitidos.length > 0 && !permitidos.includes(Number(value))) {
                throw new Error(`Para este grado lo periodos permitidos son: ${permitidos.join(" - ")}.`);
            }
            return true;
        }),

    validarCampoRequerido("texto", "Ingrese la descripción del juicio.")
        .isLength({ min: 10 })
        .withMessage("La descripción del juicio debe tener mínimo 10 caracteres."),

    body("dimensionId")
        .custom(async (value, { req }) => {
            const asignaturaId = req.body.asignaturaId;
            const idDimension = Number(value);

            // CASO GLOBAL (Sin Asignatura) o Asignatura Normal
            if (!asignaturaId) {
                // Si es juicio global (sin asignatura), validamos que la dimensión exista
                if (!value || idDimension <= 0) throw new Error("Seleccione una competencia válida.");
                // Permitimos 999 si es un global de comportamiento
                const dimension = await Dimension.findByPk(idDimension);
                if (!dimension && idDimension !== 999) throw new Error("La competencia seleccionada no existe.");
                return true;
            }

            // Buscar la asignatura específica
            const asignatura = await Asignatura.findByPk(asignaturaId);
            if (!asignatura) return true; // Validado en otro campo

            // Asignatura COMPORTAMIENTO
            if (esAsignaturaComportamiento(asignatura)) {
                if (idDimension !== 999) {
                    throw new Error("El Comportamiento no debe tener competencias vinculadas. Por favor, asegúrese de seleccionar la opción NO APLICA.");
                }
                return true;
            }

            // Cualquier asignatura que NO sea COMPORTAMIENTO
            if (idDimension === 999) {
                throw new Error("Esta asignatura no puede usarse sin competencia. Seleccione una competencia válida (Académica, Social, laboral, etc.).");
            }

            // Validamos que sea un ID válido y exista en BD
            if (!value || idDimension <= 0) {
                throw new Error("Seleccione una competencia válida.");
            }

            const dimension = await Dimension.findByPk(idDimension);
            if (!dimension) throw new Error("La competencia seleccionada no existe.");

            return true;
        }),

    validarCampoRequerido("desempenoId", "Seleccione el indicador de desempeño.")
        .isInt({ min: 1 }).bail()
        .custom(async (desempenoId, { req }) => {
            const { gradoId, asignaturaId, dimensionId } = req.body;

            // Buscar el indicador de desempeño
            const desempeno = await Desempeno.findByPk(desempenoId);
            if (!desempeno) throw new Error("El indicador de desempeño seleccionado no existe.");

            // Cargamos objetos si existen los IDs
            const grado = gradoId ? await Grado.findByPk(gradoId) : null;
            const asignatura = asignaturaId ? await Asignatura.findByPk(asignaturaId) : null;

            let esAcumulativa = false;
            let esLaboral = false;
            let esSocial = false;

            // Solo buscamos si la dimensionId es válida y diferente de 999 (NO APLICA)
            if (dimensionId && Number(dimensionId) !== 999) {
                const dimension = await Dimension.findByPk(dimensionId);
                if (dimension) {
                    const dimNombre = normalizar(dimension.nombre);
                    if (dimNombre === "ACUMULATIVA") esAcumulativa = true;
                    if (dimNombre === "SOCIAL") esSocial = true;
                    if (dimNombre === "LABORAL") esLaboral = true;
                }
            }

            // --- EVALUACIÓN DE REGLAS ---
            const esPreescolar = esGradoPreescolar(grado);
            const esComportamiento = asignatura ? esAsignaturaComportamiento(asignatura) : (Number(dimensionId) === 999);

            // Competencias Transversales (Acumulativa, Laboral, Social)
            // Estas SIEMPRE usan escala múltiple en grados normales (y en globales)
            const esCompetenciaTransversal = esAcumulativa || esLaboral || esSocial;

            // ¿Debe usar escala múltiple (Bajo, Básico, Alto, Superior)?
            // SE CUMPLE SI: Es Preescolar o es Comportamiento o es competencia Transversal
            const debeUsarEscalaMultiple = esPreescolar || esComportamiento || esCompetenciaTransversal;

            const nombreDesempeno = normalizar(desempeno.nombre);
            const escalaMultiple = ["BAJO", "BASICO", "ALTO", "SUPERIOR"];

            if (debeUsarEscalaMultiple) {
                // Caso: Preescolar, Comportamiento o Acumulativa
                if (!escalaMultiple.includes(nombreDesempeno)) {
                    throw new Error("El indicador de desempeño debe ser: BAJO, BÁSICO, ALTO o SUPERIOR.");
                }
            } else {
                // Caso: Materias normales de Primaria/Secundaria en dimensiones normales (Cognitiva, etc.)
                if (nombreDesempeno !== "UNICO") {
                    throw new Error("El indicador de desempeño debe ser UNICO.");
                }
            }
            return true;
        }),

    body("activo").optional().isBoolean(),

    validationErrorHandler,
];

// Validar actualizar juicio
export const validarActualizarJuicio = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El juicio seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Juicio, "id", "el juicio")),

    body("gradoId")
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1 }).withMessage("El grado seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado")),

    body("asignaturaId")
        .optional({ nullable: true, checkFalsy: true })
        .isInt({ min: 1 }).withMessage("La asignatura seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura")),

    validarCampoOpcionalRequerido("periodo", "Seleccione el periodo académico.")
        .isInt({ min: 1, max: 4 }).bail()
        .custom(async (value, { req }) => {
            const gradoId = req.body.gradoId;
            if (!gradoId) return true; // Si es global, permitimos cualquier periodo (1-4)

            const { config } = await obtenerConfigGrado(gradoId);
            const permitidos = config.periodosPermitidos || [];
            // Si no hay configuración de periodos, asumimos que todos están permitidos o lanzamos error.
            if (permitidos.length > 0 && !permitidos.includes(Number(value))) {
                throw new Error(`Para este grado lo periodos permitidos son: ${permitidos.join(" - ")}.`);
            }
            return true;
        }),

    validarCampoOpcionalRequerido("texto", "Ingrese la descripción del juicio.")
        .isLength({ min: 10 })
        .withMessage("La descripción del juicio debe tener mínimo 10 caracteres."),

    body("dimensionId")
        .custom(async (value, { req }) => {
            const asignaturaId = req.body.asignaturaId;
            const idDimension = Number(value);

            // CASO GLOBAL (Sin Asignatura) o Asignatura Normal
            if (!asignaturaId) {
                // Si es juicio global (sin asignatura), validamos que la dimensión exista
                if (!value || idDimension <= 0) throw new Error("Seleccione una competencia válida.");
                // Permitimos 999 si es un global de comportamiento
                const dimension = await Dimension.findByPk(idDimension);
                if (!dimension && idDimension !== 999) throw new Error("La competencia seleccionada no existe.");
                return true;
            }

            // Buscar la asignatura específica
            const asignatura = await Asignatura.findByPk(asignaturaId);
            if (!asignatura) return true; // Validado en otro campo

            // Asignatura COMPORTAMIENTO
            if (esAsignaturaComportamiento(asignatura)) {
                if (idDimension !== 999) {
                    throw new Error("El Comportamiento no debe tener competencias vinculadas. Por favor, asegúrese de seleccionar la opción NO APLICA.");
                }
                return true;
            }

            // Cualquier asignatura que NO sea COMPORTAMIENTO
            if (idDimension === 999) {
                throw new Error("Esta asignatura no puede usarse sin competencia. Seleccione una competencia válida (Académica, Social, laboral, etc.).");
            }

            // Validamos que sea un ID válido y exista en BD
            if (!value || idDimension <= 0) {
                throw new Error("Seleccione una competencia válida.");
            }

            const dimension = await Dimension.findByPk(idDimension);
            if (!dimension) throw new Error("La competencia seleccionada no existe.");

            return true;
        }),

    validarCampoOpcionalRequerido("desempenoId", "Seleccione el indicador de desempeño.")
        .isInt({ min: 1 }).bail()
        .custom(async (desempenoId, { req }) => {
            const { gradoId, asignaturaId, dimensionId } = req.body;

            // Buscar el indicador de desempeño
            const desempeno = await Desempeno.findByPk(desempenoId);
            if (!desempeno) throw new Error("El indicador de desempeño seleccionado no existe.");

            // Cargamos objetos si existen los IDs
            const grado = gradoId ? await Grado.findByPk(gradoId) : null;
            const asignatura = asignaturaId ? await Asignatura.findByPk(asignaturaId) : null;

            let esAcumulativa = false;
            let esLaboral = false;
            let esSocial = false;

            // Solo buscamos si la dimensionId es válida y diferente de 999 (NO APLICA)
            if (dimensionId && Number(dimensionId) !== 999) {
                const dimension = await Dimension.findByPk(dimensionId);
                if (dimension) {
                    const dimNombre = normalizar(dimension.nombre);
                    if (dimNombre === "ACUMULATIVA") esAcumulativa = true;
                    if (dimNombre === "SOCIAL") esSocial = true;
                    if (dimNombre === "LABORAL") esLaboral = true;
                }
            }

            // --- EVALUACIÓN DE REGLAS ---
            const esPreescolar = esGradoPreescolar(grado);
            const esComportamiento = asignatura ? esAsignaturaComportamiento(asignatura) : (Number(dimensionId) === 999);

            // Competencias Transversales (Acumulativa, Laboral, Social)
            // Estas SIEMPRE usan escala múltiple en grados normales (y en globales)
            const esCompetenciaTransversal = esAcumulativa || esLaboral || esSocial;

            // ¿Debe usar escala múltiple (Bajo, Básico, Alto, Superior)?
            // SE CUMPLE SI: Es Preescolar o es Comportamiento o es competencia Transversal
            const debeUsarEscalaMultiple = esPreescolar || esComportamiento || esCompetenciaTransversal;

            const nombreDesempeno = normalizar(desempeno.nombre);
            const escalaMultiple = ["BAJO", "BASICO", "ALTO", "SUPERIOR"];

            if (debeUsarEscalaMultiple) {
                // Caso: Preescolar, Comportamiento o Acumulativa
                if (!escalaMultiple.includes(nombreDesempeno)) {
                    throw new Error("El indicador de desempeño debe ser: BAJO, BÁSICO, ALTO o SUPERIOR.");
                }
            } else {
                // Caso: Materias normales de Primaria/Secundaria en dimensiones normales (Cognitiva, etc.)
                if (nombreDesempeno !== "UNICO") {
                    throw new Error("El indicador de desempeño debe ser UNICO.");
                }
            }
            return true;
        }),

    validationErrorHandler,
];