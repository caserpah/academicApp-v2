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
 * Helper: identificar asignatura COMPORTAMIENTO
 */
const esAsignaturaComportamiento = (asignatura) =>
    asignatura?.nombre?.toUpperCase() === " COMPORTAMIENTO" ||
    asignatura?.nombre?.toUpperCase() === "COMPORTAMIENTO";

async function obtenerConfigGrado(gradoId) {
    const grado = await Grado.findByPk(gradoId, {
        include: [{
            model: ConfigGrado,
            as: "configuracion"
        }],
    });

    if (!grado) throw new Error("El grado seleccionado no existe.");

    if (!grado.configuracion) {
        throw new Error("No existe configuración académica para el grado seleccionado.");
    }

    return { grado, config: grado.configuracion };
}

// Validar crear juicio
export const ValidarCrearJuicio = [
    validarCampoRequerido("gradoId", "Seleccione el grado al que pertenece el juicio.")
        .isInt({ min: 1 })
        .withMessage("El grado seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado")),

    validarCampoRequerido("asignaturaId", "Seleccione la asignatura a la que pertenece el juicio.")
        .isInt({ min: 1 })
        .withMessage("La asignatura seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura")),

    validarCampoRequerido("periodo", "Seleccione el periodo académico al que pertenece el juicio.")
        .isInt({ min: 1, max: 4 })
        .withMessage("El periodo académico debe estar entre 1 y 4.")
        .bail()
        .custom(async (value, { req }) => {
            const gradoId = req.body.gradoId;
            if (!gradoId) return true;

            const { config } = await obtenerConfigGrado(gradoId);
            const permitidos = config.periodosPermitidos || [];

            if (!permitidos.includes(Number(value))) {
                throw new Error(
                    `El grado seleccionado solo puede registrar juicios para los periodos: ${permitidos.join(", ")}.`
                );
            }
            return true;
        }),

    validarCampoRequerido("texto", "Ingrese la descripción del juicio.")
        .isLength({ min: 10 })
        .withMessage("La descripción del juicio debe tener al menos 10 caracteres."),

    // dimensionId: requerido excepto COMPORTAMIENTO
    body("dimensionId")
        .custom(async (value, { req }) => {
            const asignaturaId = req.body.asignaturaId;
            if (!asignaturaId) return true;

            const asignatura = await Asignatura.findByPk(asignaturaId);
            const esComportamiento = asignatura.nombre.toUpperCase() === "COMPORTAMIENTO";

            if (esComportamiento) {
                // Esta asignatura NO usa dimensiones → debe venir 0
                if (value !== 999) {
                    throw new Error("El COMPORTAMIENTO no utiliza dimensión.");
                }

                return true;
            }

            // --- Otras asignaturas ---
            if (!value || value <= 0) {
                throw new Error("Debe seleccionar una dimensión válida.");
            }

            const dimension = await Dimension.findByPk(value);
            if (!dimension) {
                throw new Error("La dimensión seleccionada no es válida.");
            }

            return true;
        }),

    // desempeño: validado según config del grado + excepción Comportamiento
    validarCampoRequerido("desempenoId", "Seleccione el desempeño asociado al juicio.")
        .isInt({ min: 1 })
        .withMessage("El desempeño seleccionado no es válido.")
        .bail()
        .custom(async (desempenoId, { req }) => {
            const desempeno = await Desempeno.findByPk(desempenoId);
            if (!desempeno) throw new Error("El desempeño seleccionado no existe.");

            const gradoId = req.body.gradoId;
            const asignaturaId = req.body.asignaturaId;

            if (!gradoId || !asignaturaId) return true;

            const asignatura = await Asignatura.findByPk(asignaturaId);
            const esComp = esAsignaturaComportamiento(asignatura);

            const { config } = await obtenerConfigGrado(gradoId);

            const nombre = desempeno.nombre.toUpperCase();

            if (config.usaDesempenosMultiples || esComp) {
                const permitidos = ["BAJO", "BASICO", "ALTO", "SUPERIOR"];
                if (!permitidos.includes(nombre)) {
                    throw new Error(
                        "Para este grado y/o asignatura el desempeño debe ser BAJO, BASICO, ALTO o SUPERIOR."
                    );
                }
            } else {
                if (nombre !== "UNICO") {
                    throw new Error("Para este grado el desempeño debe ser 'UNICO'.");
                }
            }

            return true;
        }),

    body("activo")
        .optional()
        .isBoolean()
        .withMessage("El campo 'activo' debe ser verdadero o falso."),
];

// Validar actualizar juicio
export const validarActualizarJuicio = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El juicio seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Juicio, "id", "el juicio")),

    validarCampoOpcionalRequerido("gradoId", "Seleccione el grado al que pertenece el juicio.")
        .isInt({ min: 1 })
        .withMessage("El grado seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Grado, "id", "el grado")),

    validarCampoOpcionalRequerido("asignaturaId", "Seleccione la asignatura a la que pertenece el juicio.")
        .isInt({ min: 1 })
        .withMessage("La asignatura seleccionada no es válida.")
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura")),

    validarCampoOpcionalRequerido("periodo", "Seleccione el periodo académico al que pertenece el juicio.")
        .isInt({ min: 1, max: 4 })
        .withMessage("El periodo académico debe estar entre 1 y 4.")
        .bail()
        .custom(async (value, { req }) => {
            if (!value) return true;

            const juicio = await Juicio.findByPk(req.params.id);
            if (!juicio) return true;

            const gradoId = req.body.gradoId ?? juicio.gradoId;
            const { config } = await obtenerConfigGrado(gradoId);
            const permitidos = config.periodosPermitidos || [];

            if (!permitidos.includes(Number(value))) {
                throw new Error(
                    `El grado seleccionado solo puede registrar juicios para los periodos: ${permitidos.join(", ")}.`
                );
            }
            return true;
        }),

    validarCampoOpcionalRequerido("texto", "Ingrese la descripción del juicio.")
        .isLength({ min: 10 })
        .withMessage("La descripción del juicio debe tener al menos 10 caracteres."),

    // dimensionId opcional, con la misma regla de Comportamiento
    body("dimensionId")
        .optional()
        .custom(async (value, { req }) => {
            const asignaturaId = req.body.asignaturaId ?? req.existingJuicio?.asignaturaId;
            const asignatura = await Asignatura.findByPk(asignaturaId);

            if (!asignatura) return true;

            const esComportamiento = asignatura.nombre.toUpperCase() === "COMPORTAMIENTO";

            if (esComportamiento) {
                if (value !== 999) {
                    throw new Error("El COMPORTAMIENTO no utiliza dimensión.");
                }
                return true;
            }

            if (value !== undefined && (value <= 0)) {
                throw new Error("Debe seleccionar una dimensión válida.");
            }

            const dimension = await Dimension.findByPk(value);
            if (!dimension) {
                throw new Error("La dimensión seleccionada no es válida.");
            }

            return true;
        }),

    body("desempenoId")
        .optional()
        .isInt({ min: 1 })
        .withMessage("El desempeño seleccionado no es válido.")
        .bail()
        .custom(async (desempenoId, { req }) => {
            if (!desempenoId) return true;

            const juicio = await Juicio.findByPk(req.params.id);
            if (!juicio) return true;

            const desempeno = await Desempeno.findByPk(desempenoId);
            if (!desempeno) throw new Error("El desempeño seleccionado no existe.");

            const gradoId = req.body.gradoId ?? juicio.gradoId;
            const asignaturaId = req.body.asignaturaId ?? juicio.asignaturaId;

            const asignatura = await Asignatura.findByPk(asignaturaId);
            const esComp = esAsignaturaComportamiento(asignatura);

            const { config } = await obtenerConfigGrado(gradoId);
            const nombre = desempeno.nombre.toUpperCase();

            if (config.usaDesempenosMultiples || esComp) {
                const permitidos = ["BAJO", "BASICO", "ALTO", "SUPERIOR"];
                if (!permitidos.includes(nombre)) {
                    throw new Error(
                        "Para este grado y/o asignatura el desempeño debe ser BAJO, BASICO, ALTO o SUPERIOR."
                    );
                }
            } else {
                if (nombre !== "UNICO") {
                    throw new Error("Para este grado el desempeño debe ser 'UNICO'.");
                }
            }

            return true;
        }),

    body("activo")
        .optional()
        .isBoolean()
        .withMessage("El campo 'activo' debe ser verdadero o falso."),
];