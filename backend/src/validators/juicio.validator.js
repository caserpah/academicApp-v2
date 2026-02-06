import { body, param } from "express-validator";
import { Op } from "sequelize";
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
        .isInt({ min: 0, max: 5 })
        .withMessage("El periodo debe ser válido (0=Global, 1-4 o 5 para Final).")
        .bail()
        .custom(async (value, { req }) => {
            const val = Number(value);
            const { gradoId, asignaturaId, dimensionId } = req.body;

            // Caso especial: periodo 0 = Todos los periodos (solo para Comportamiento o Transversales)
            if (val === 0) {
                // Verificar si es Comportamiento
                let esComportamiento = false;
                if (asignaturaId) {
                    const asig = await Asignatura.findByPk(asignaturaId);
                    if (asig && esAsignaturaComportamiento(asig)) esComportamiento = true;
                }

                // Verificar si es Transversal (Sin grado/asignatura y con dimensión social/laboral/acumulativa)
                let esTransversal = false;
                if (!gradoId && !asignaturaId && dimensionId) {
                    const dim = await Dimension.findByPk(dimensionId);
                    if (dim) {
                        const nombreDim = normalizar(dim.nombre);
                        if (["SOCIAL", "LABORAL", "ACUMULATIVA"].includes(nombreDim)) esTransversal = true;
                    }
                }

                if (!esComportamiento && !esTransversal) {
                    throw new Error('La opción "Todos los Periodos" solo es válida para Comportamiento o Competencias Transversales.');
                }
                return true; // Es válido
            }

            // Si es 5 (Final), lo permitimos siempre
            if (val === 5) return true;

            // Validaciones normales de 1 a 4
            if (!gradoId) return true;

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
            const { gradoId, asignaturaId } = req.body;
            const idDimension = Number(value);

            // Validamos existencia básica primero
            if (!value || idDimension <= 0) throw new Error("Seleccione una competencia válida.");
            const dimension = await Dimension.findByPk(idDimension);

            // Permitimos 999 si es un global de comportamiento, si no debe existir
            if (!dimension && idDimension !== 999) throw new Error("La competencia seleccionada no existe.");

            // Si no tiene grado ni asignatura, debe ser Transversal (Social, Laboral, Acumulativa)
            if (!gradoId && !asignaturaId) {
                const nombreDim = normalizar(dimension?.nombre);
                const TRANSVERSALES = ["SOCIAL", "LABORAL", "ACUMULATIVA"];

                if (!TRANSVERSALES.includes(nombreDim)) {
                    throw new Error("Un juicio global (sin grado ni asignatura) solo aplica a competencia: Social, Laboral o Acumulativa.");
                }
                return true;
            }

            // --- REGLAS DE ASIGNATURA ---
            if (asignaturaId) {
                const asignatura = await Asignatura.findByPk(asignaturaId);
                if (!asignatura) return true;

                // Asignatura COMPORTAMIENTO
                if (esAsignaturaComportamiento(asignatura)) {
                    if (idDimension !== 999) {
                        throw new Error("El Comportamiento no debe tener competencias vinculadas. Seleccione NO APLICA.");
                    }
                    return true;
                }

                // Cualquier asignatura que NO sea COMPORTAMIENTO
                if (idDimension === 999) {
                    throw new Error("Esta asignatura no puede usarse sin competencia. Seleccione una competencia válida (Académica, Social, laboral, etc.).");
                }
            } else {
                // Si no tiene asignatura pero sí grado, no puede usar NO APLICA (999)
                // porque no sería un juicio de comportamiento global, sino uno académico global y todos los académicos deben tener competencia
                if (idDimension === 999) {
                    throw new Error("La opción NO APLICA solo es válida para juicios de comportamiento. Si este juicio no es de comportamiento, por favor seleccione una competencia válida.");
                }
            }
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

            let esAcumulativa = false, esLaboral = false, esSocial = false;

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
            const escalaMultiple = ["BAJO", "BASICO", "BÁSICO", "ALTO", "SUPERIOR"];

            if (debeUsarEscalaMultiple) {
                // Caso: Preescolar, Comportamiento o Acumulativa
                // Buscamos coincidencia parcial o exacta
                const match = escalaMultiple.some(n => n === nombreDesempeno || nombreDesempeno.includes(n));
                if (!match) throw new Error("El indicador de desempeño debe ser: BAJO, BÁSICO, ALTO o SUPERIOR.");
            } else {
                // Caso: asignaturas normales de Primaria/Secundaria en dimensiones normales (Cognitiva, etc.)
                if (nombreDesempeno !== "UNICO" && nombreDesempeno !== "ÚNICO") {
                    throw new Error("El indicador de desempeño debe ser UNICO.");
                }
            }
            return true;
        }),

    // VALIDACIÓN DE DUPLICADOS (INTEGRIDAD)
    // Se inserta aquí para evitar crear registros idénticos
    body("desempenoId").custom(async (value, { req }) => {
        const { vigenciaId, periodo, gradoId, asignaturaId, dimensionId } = req.body;

        // Convertimos undefined/"" a null para la consulta correcta
        const grado = gradoId || null;
        const asignatura = asignaturaId || null;

        const duplicado = await Juicio.findOne({
            where: {
                vigenciaId,
                periodo,
                dimensionId,
                desempenoId: value, // El que estamos validando
                gradoId: grado,
                asignaturaId: asignatura
            }
        });

        if (duplicado) {
            const tipo = (!grado && !asignatura) ? "GLOBAL" : "ESPECÍFICO";
            throw new Error(`Ya existe un juicio ${tipo} idéntico para este Periodo, Competencia y Desempeño.`);
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

    body("periodo")
        .optional()
        .isInt({ min: 0, max: 5 })
        .withMessage("El periodo debe ser válido (0=Global, 1-4 o 5 para Final).")
        .bail()
        .custom(async (value, { req }) => {
            const val = Number(value);
            const { gradoId, asignaturaId, dimensionId } = req.body;

            // Caso especial: periodo 0 = Todos los periodos (solo para Comportamiento o Transversales)
            if (val === 0) {
                // Verificar si es Comportamiento
                let esComportamiento = false;
                if (asignaturaId) {
                    const asig = await Asignatura.findByPk(asignaturaId);
                    if (asig && esAsignaturaComportamiento(asig)) esComportamiento = true;
                }

                // Verificar si es Transversal (Sin grado/asignatura y con dimensión social/laboral/acumulativa)
                let esTransversal = false;
                if (!gradoId && !asignaturaId && dimensionId) {
                    const dim = await Dimension.findByPk(dimensionId);
                    if (dim) {
                        const nombreDim = normalizar(dim.nombre);
                        if (["SOCIAL", "LABORAL", "ACUMULATIVA"].includes(nombreDim)) esTransversal = true;
                    }
                }

                if (!esComportamiento && !esTransversal) {
                    throw new Error('La opción "Todos los Periodos" solo es válida para Comportamiento o Competencias Transversales.');
                }
                return true; // Es válido
            }

            // Si es 5 (Final), lo permitimos siempre
            if (val === 5) return true;

            // Validaciones normales de 1 a 4
            if (!gradoId) return true;

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

    body("desempenoId")
        .optional() // Solo si se envía validamos duplicidad
        .custom(async (value, { req }) => {
            const idJuicio = req.params.id;
            const { vigenciaId, periodo, gradoId, asignaturaId, dimensionId } = req.body;

            if (!vigenciaId || !periodo || !dimensionId) return true; // Faltan datos para validar integridad

            const duplicado = await Juicio.findOne({
                where: {
                    vigenciaId,
                    periodo,
                    dimensionId,
                    desempenoId: value,
                    gradoId: gradoId || null,
                    asignaturaId: asignaturaId || null,
                    id: { [Op.ne]: idJuicio } // <--- Excluir el registro actual
                }
            });

            if (duplicado) {
                throw new Error("Ya existe otro juicio con esta misma combinación de datos.");
            }
            return true;
        }),

    body("activo").optional().isBoolean(),

    validationErrorHandler,
];