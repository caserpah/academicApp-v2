import { body } from "express-validator";
import { ForeignKeyConstraintError } from "sequelize";
import { Op } from "sequelize";

/**
 * Valida si un valor es único para un campo dado en un modelo Sequelize.
 * Puede excluir el registro actual durante la actualización.
 *
 * @param {Model} Modelo - Modelo de Sequelize (ej. Colegio)
 * @param {string} campo - Nombre del campo a validar
 * @param {string} nombreEntidad - Nombre legible (ej: 'vigencia', 'sede', 'colegio')
 * @param {boolean} [ignorarActual=false] - Si debe excluir el ID actual (para updates)
 * @param {string|null} [mensajePersonalizado=null] - Mensaje personalizado opcional
 * @param {string|null} [etiquetaCampo=null] - Nombre legible del campo (ej. "Registro DANE", "Código")
 * @returns {function} - Función usable con express-validator `.custom(...)`
 */
export const validarCampoUnico = (
    Modelo,
    campo,
    nombreEntidad = "un registro",
    ignorarActual = false,
    mensajePersonalizado = null,
    etiquetaCampo = null
) => {
    return async (value, { req }) => {
        const whereClause = { [campo]: value };

        // Excluir el registro actual durante actualizaciones (PUT)
        if (ignorarActual && req?.params?.id) {
            whereClause.id = { [Op.ne]: Number(req.params.id) };
        }

        const registro = await Modelo.findOne({ where: whereClause });
        if (registro) {
            const etiqueta = etiquetaCampo || campo;
            throw new Error(
                mensajePersonalizado ||
                `Ya existe ${nombreEntidad} con ${etiqueta} ${value}.`
            );
        }

        return true; // El campo es único
    };
};

/**
 * Genera un mensaje amigable y flexible para errores de clave foránea.
 * Puede recibir el nombre del modelo y su relación para personalizar el texto.
 *
 * @param {Error} error - Error lanzado por Sequelize (ForeignKeyConstraintError)
 * @param {string} [nombreEntidad="registro"] - Entidad que el usuario intenta eliminar
 * @param {string|null} [relacionAsociada=null] - Relación o entidad dependiente (ej: 'grupos', 'sedes', 'matrículas')
 * @returns {Error} - Error con mensaje amigable y status 409
 */
export const formatearErrorForaneo = (
    error,
    nombreEntidad = "registro",
    relacionAsociada = null
) => {
    if (error instanceof ForeignKeyConstraintError) {
        let message;

        if (relacionAsociada) {
            message = `No puedes eliminar ${nombreEntidad} porque tiene ${relacionAsociada}.`;
        } else {
            message = `No puedes eliminar ${nombreEntidad} porque está relacionado con otros registros del sistema.`;
        }

        const err = new Error(message);
        err.status = 409; // Conflict
        return err;
    }

    // Si no es un error de FK, retornar el original sin cambios
    return error;
};

/**
 * Verifica si un registro existe por su ID.
 * @param {Model} Modelo - El modelo Sequelize a consultar.
 * @param {string} [idField='id'] - El nombre del campo ID.
 * @param {string} [nombreEntidad='el registro'] - Nombre de la entidad para el mensaje de error.
 */
export const verificarExistenciaPorId = (
    Modelo,
    idField = "id",
    nombreEntidad = "el registro"
) => {
    return async (value) => {
        const idNumerico = Number(value);
        if (isNaN(idNumerico) || idNumerico <= 0) {
            throw new Error(`El identificador proporcionado para ${nombreEntidad} no es válido.`);
        }

        const registro = await Modelo.findByPk(idNumerico);
        if (!registro) {
            throw new Error(`No se encontró ${nombreEntidad}.`);
        }

        return true;
    };
};

/**
 * Verifica si un registro existe por un campo específico (no solo ID).
 * Permite definir una etiqueta legible del campo para los mensajes.
 *
 * @param {Model} Modelo - Modelo Sequelize.
 * @param {string} campo - Campo de la base de datos (ej. "documento", "codigo").
 * @param {string} nombreEntidad - Nombre legible de la entidad (ej. "la sede", "el colegio").
 * @param {string} [etiquetaCampo=null] - Nombre legible del campo (ej. "Código", "Registro DANE").
 * @returns {function} - Función usable con express-validator `.custom(...)`
 */
export const verificarExistenciaPorCampo = (
    Modelo,
    campo,
    nombreEntidad = "el registro",
    etiquetaCampo = null
) => {
    return async (value) => {
        const where = { [campo]: value };
        const registro = await Modelo.findOne({ where });

        if (!registro) {
            const etiqueta = etiquetaCampo || campo;
            throw new Error(
                `No se encontró ${nombreEntidad} con ${etiqueta} ${value}.`
            );
        }
        return true;
    };
};

/**
 * Campo requerido con trim y escape opcional.
 */
export const validarCampoRequerido = (campo, mensaje, shouldEscape = true) =>
    shouldEscape
        ? body(campo).trim().notEmpty().withMessage(mensaje).bail().escape()
        : body(campo).trim().notEmpty().withMessage(mensaje).bail();

/**
 * Campo opcional, con trim y escape opcional.
 */
export const validarCampoOpcional = (campo, shouldEscape = true) =>
    shouldEscape
        ? body(campo).optional({ nullable: true, checkFalsy: true }).trim().escape()
        : body(campo).optional({ nullable: true, checkFalsy: true }).trim();

/**
 * Campo alfanumérico requerido.
 */
export const validarCampoAlfaNumerico = (campo, mensaje) => {
    return body(campo)
        .trim()
        .notEmpty().withMessage(mensaje)
        .isAlphanumeric().withMessage(
            "El campo solo debe contener letras y números, sin espacios ni caracteres especiales."
        )
        .escape();
};

/** Campo contacto opcional */
export const validarCampoContactoOpcional = (campo = "contacto") => {
    return body(campo)
        .optional({ checkFalsy: true })
        .isLength({ min: 10, max: 12 })
        .withMessage("El teléfono de contacto debe tener entre 10 y 12 dígitos.")
        .isNumeric()
        .withMessage("El teléfono de contacto solo debe contener números.");
};

/**
 * Campo opcional pero obligatorio si se proporciona.
 */
export const validarCampoOpcionalRequerido = (campo, mensaje, shouldEscape = true) => {
    return body(campo)
        .optional({ nullable: true }) // se activa SOLO si el campo viene en el body
        .custom(value => {
            if (value === "") {
                throw new Error(mensaje);
            }
            return true;
        })
        .bail()
        .trim()
        .if((value, { req }) => value !== undefined && value !== null) // si viene, valida
        .notEmpty()
        .withMessage(mensaje)
        .bail()
    [(shouldEscape ? "escape" : "trim")]();
};

/**
 * Valida que una fecha esté en formato ISO 8601 y no sea posterior a la actual.
 * @param {string} campo - Nombre del campo a validar.
 * @param {string} etiqueta - Nombre legible del campo (para mensajes).
 * @param {boolean} [opcional=false] - Si la fecha puede omitirse.
 * @returns {ValidationChain}
 */
export const validarFechaNoFutura = (campo, etiqueta, opcional = false) => {
    let chain = body(campo)
        .notEmpty()
        .withMessage(`La fecha ${etiqueta} es requerida.`)
        .isISO8601()
        .withMessage(`La fecha ${etiqueta} debe estar en formato ISO 8601 (YYYY-MM-DD).`)
        .toDate()
        .custom((value) => {
            const hoy = new Date();
            if (value > hoy) {
                throw new Error(`La fecha ${etiqueta} no puede ser posterior a la actual.`);
            }
            return true;
        });

    if (opcional) chain = chain.optional({ checkFalsy: true });

    return chain;
};