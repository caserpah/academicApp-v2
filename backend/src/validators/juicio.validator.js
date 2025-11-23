import { body, param } from "express-validator";
import {
    validarCampoRequerido,
    validarCampoOpcionalRequerido,
    verificarExistenciaPorId,
} from "../utils/dbUtils.js";
import { validarNotas } from "../utils/validarNotas.js";
import { Asignatura } from "../models/asignatura.js";
import { Juicio } from "../models/juicio.js";

// Grados de preescolar permitidos
const GRADOS_PREESCOLAR = ["PRE_JARDIN", "JARDIN", "TRANSICION"];

/**
 * Validación de periodo según grado
 */
function validarPeriodoPorGrado() {
    return body("periodo").custom((value, { req }) => {
        const grado = req.body.grado;

        if (!grado) return true;

        // Ciclo V → solo periodos 1 y 2
        if (grado === "CICLO_V" && ![1, 2].includes(Number(value))) {
            throw new Error("El Ciclo V solo pueden registrar juicios para los periodos 1 y 2.");
        }

        // Ciclo VI → solo periodos 3 y 4
        if (grado === "CICLO_VI" && ![3, 4].includes(Number(value))) {
            throw new Error("El Ciclo VI solo pueden registrar juicios para los periodos 3 y 4.");
        }
        return true;
    });
}

// Validar crear juicio
export const ValidarCrearJuicio = [
    validarCampoRequerido("tipo", "Especifique el tipo de juicio.")
        .isIn(["CUANTITATIVO", "CUALITATIVO"])
        .withMessage("El tipo de juicio no es valido."),

    validarCampoRequerido("grado", "Seleccione el grado al que pertenece el juicio.")
        .isIn([
            "PRE_JARDIN", "JARDIN", "TRANSICION",
            "PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO",
            "SEXTO", "SEPTIMO", "OCTAVO", "NOVENO", "DECIMO", "ONCE",
            "CICLO_III", "CICLO_IV", "CICLO_V", "CICLO_VI"
        ])
        .withMessage("El grado no es valido."),

    validarCampoRequerido("periodo", "Seleccione el periodo académico al que pertenece el juicio.")
        .isInt({ min: 1, max: 4 })
        .withMessage("El periodo académico debe estar entre 1 y 4."),
    validarPeriodoPorGrado(),

    validarCampoRequerido("dimension", "Seleccione la dimensión del juicio.")
        .isIn(["ACADEMICA", "LABORAL", "SOCIAL", "ACUMULATIVA"])
        .withMessage("El valor de la dimensión no es valida."),

    validarCampoRequerido("texto", "Ingrese la descripción del juicio.")
        .isLength({ min: 10 }).withMessage("La descripción del juicio debe tener al menos 10 caracteres."),

    /** Desempeño obligatorio solo en preescolar */
    body("desempeno")
        .custom((value, { req }) => {

            const grado = (req.body.grado || "").toUpperCase();

            if (GRADOS_PREESCOLAR.includes(grado)) {
                if (!value ||
                    !["BAJO", "BASICO", "ALTO", "SUPERIOR"].includes(value.toUpperCase())
                ) {
                    throw new Error("Debe seleccionar un desempeño válido.");
                }
            } else {
                if (value && value !== "UNICO") {
                    throw new Error("Para primaria y secundaria el desempeño debe ser 'UNICO'.");
                }
            }

            return true;
        }),

    // Validación de las notas usando el utilitario
    body(["minNota", "maxNota"])
        .custom((value, { req }) => {

            const grado = (req.body.grado || "").toUpperCase();

            // Validar notas SOLO si el grado es preescolar
            if (GRADOS_PREESCOLAR.includes(grado)) {
                validarNotas({
                    minNota: req.body.minNota,
                    maxNota: req.body.maxNota,
                    desempeno: req.body.desempeno,
                });
            }
            return true;
        }),

    validarCampoOpcionalRequerido("asignaturaId", "Seleccione la asignatura a la que pertenece el juicio.")
        .isInt({ min: 1 })
        .withMessage("El identificador de la asignatura no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Asignatura, "id", "la asignatura seleccionada")),
];

// Validar actualizar juicio
export const validarActualizarJuicio = [
    param("id")
        .isInt({ min: 1 })
        .withMessage("El juicio seleccionado no es válido.")
        .bail()
        .custom(verificarExistenciaPorId(Juicio, "id", "el juicio")),

    validarCampoOpcionalRequerido("tipo", "Especifique el tipo de juicio.")
        .isIn(["CUANTITATIVO", "CUALITATIVO"])
        .withMessage("El tipo de juicio no es valido."),

    validarCampoOpcionalRequerido("grado", "Seleccione el grado al que pertenece el juicio.")
        .isIn([
            "PRE_JARDIN", "JARDIN", "TRANSICION",
            "PRIMERO", "SEGUNDO", "TERCERO", "CUARTO", "QUINTO",
            "SEXTO", "SEPTIMO", "OCTAVO", "NOVENO", "DECIMO", "ONCE",
            "CICLO_III", "CICLO_IV", "CICLO_V", "CICLO_VI"
        ])
        .withMessage("El grado no es valido."),

    validarCampoOpcionalRequerido("periodo", "Seleccione el periodo académico al que pertenece el juicio.")
        .isInt({ min: 1, max: 4 })
        .withMessage("El periodo académico debe estar entre 1 y 4."),
    validarPeriodoPorGrado(),

    validarCampoOpcionalRequerido("dimension", "Seleccione la dimensión del juicio.")
        .isIn(["ACADEMICA", "LABORAL", "SOCIAL", "ACUMULATIVA"])
        .withMessage("El valor de la dimensión no es valida."),

    validarCampoOpcionalRequerido("texto", "Ingrese la descripción del juicio.")
        .isLength({ min: 10 }).withMessage("La descripción del juicio debe tener al menos 10 caracteres."),

    /** Desempeño obligatorio solo en preescolar */
    body("desempeno")
        .custom((value, { req }) => {

            const grado = (req.body.grado || "").toUpperCase();

            if (GRADOS_PREESCOLAR.includes(grado)) {
                if (!value ||
                    !["BAJO", "BASICO", "ALTO", "SUPERIOR"].includes(value.toUpperCase())
                ) {
                    throw new Error("Debe seleccionar un desempeño válido.");
                }
            } else {
                if (value && value !== "UNICO") {
                    throw new Error("Para primaria y secundaria el desempeño debe ser 'UNICO'.");
                }
            }

            return true;
        }),

    // Validación de las notas usando el utilitario
    body(["minNota", "maxNota"])
        .custom((value, { req }) => {

            const grado = (req.body.grado || "").toUpperCase();

            // Validar notas SOLO si el grado es preescolar
            if (GRADOS_PREESCOLAR.includes(grado)) {
                validarNotas({
                    minNota: req.body.minNota,
                    maxNota: req.body.maxNota,
                    desempeno: req.body.desempeno,
                });
            }
            return true;
        }),
];