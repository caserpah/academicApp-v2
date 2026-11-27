import {
    UniqueConstraintError,
    ForeignKeyConstraintError,
    ValidationError,
} from "sequelize";
import { BusinessWarning } from "../utils/AppError.js";

/**
 * Extrae el nombre real del índice único en MySQL desde error.fields o sqlMessage
 */
const extraerNombreIndiceUnico = (error, diccionario) => {
    // 1. Buscar coincidencia directa en las llaves de error.fields
    const fieldKeys = Object.keys(error.fields || {});
    const matchDirecto = fieldKeys.find((key) => diccionario[key]);
    if (matchDirecto) return matchDirecto;

    // 2. Extraer desde sqlMessage de MySQL: "... for key 'tabla.nombre_indice'" o "... for key 'nombre_indice'"
    const sqlMessage = error.parent?.sqlMessage || error.original?.sqlMessage || "";
    const keyMatch = sqlMessage.match(/for key ['`"](?:[^'`"]+\.)?([^'`"]+)['`"]/i);
    if (keyMatch && keyMatch[1] && diccionario[keyMatch[1]]) {
        return keyMatch[1];
    }

    return null;
};

/**
 * 🌐 Manejo centralizado de errores Sequelize
 * -------------------------------------------
 * Traduce los mensajes técnicos de Sequelize a textos naturales y comprensibles
 * marcados como advertencias de negocio (alertType: 'warning').
 */
export const handleSequelizeError = (error) => {

    // --- Errores de violación de unicidad ---
    if (error instanceof UniqueConstraintError) {

        const mensajesUnicidad = {
            // Caso 1: coordinador_sedes (coordinador + sede + vigencia)
            uq_sede_vigencia: "Este coordinador ya está asignado a esta sede para el año lectivo.",
            // Caso 2: Cargas (grupo + asignatura + vigencia)
            uq_carga_grupo_asignatura_vigencia: "Esta asignatura ya está asignada a este grupo para el año lectivo.",
            // Caso 3: acudientes-estudiantes (acudienteId + estudianteId)
            uq_acudiente_estudiante: "Este acudiente ya está asociado a este estudiante.",
            // Caso 4: areas-vigencias
            idx_area_codigo_vigencia: "No es posible guardar el área. El código ingresado ya está siendo utilizado por otra área en este año lectivo.",
            idx_area_nombre_vigencia: "No es posible crear el área. Ya existe un área con el mismo nombre asignado al año lectivo vigente.",
            // Caso 5: asignaturas + areas
            idx_asignatura_codigo_vigencia: "No es posible guardar la asignatura. El código ingresado ya está siendo utilizado por otra asignatura en este año lectivo.",
            idx_asignatura_nombre_area_vigencia: "No es posible guardar la asignatura. Ya existe otro registro con esta asignatura asociado a la misma área en este año lectivo.",
            // Caso 6: coordinadorId
            coordinadorId: "El Coordinador ya cuenta con una coordinación asignada para la sede y el año lectivo seleccionados.",
            // Caso 7: Juicios
            idx_juicio_unico: "No es posible guardar el juicio. Ya existe un juicio registrado para esta asignatura con el mismo período, grado y nivel de desempeño.",
            // Caso 8: Grupos
            idx_grupo_unico: "No es posible guardar el grupo. Ya existe un grupo registrado con el mismo nombre, grado, jornada, sede y vigencia.",
            // Caso 9: Cargas (con sede)
            idx_carga_sede_grupo_asignatura_vigencia: "No es posible guardar la carga académica. Ya existe una carga académica con esta asignatura en el mismo grupo de la misma sede para este año lectivo.",
            // Caso 10: Matrículas
            idx_unique_estudiante_vigencia_grado: "Este estudiante ya tiene una matrícula activa para este grado en el año lectivo seleccionado.",
            // Caso 11: Calificaciones
            idx_unique_calificacion_periodo_estudiante_asignatura_vigencia: "Ya existe una calificación registrada para este estudiante en esta asignatura y periodo.",
            // Caso 12: Nivelaciones (Asignatura)
            idx_unique_nivelacion_estudiante_asignatura: "Este estudiante ya tiene una nivelación registrada para esta asignatura.",
            // Caso 13: Usuarios (Documento)
            unique_documento_index: "Este usuario ya está registrado con este número de documento.",
            // Caso 14: Usuarios (Email)
            unique_email_index: "El correo electrónico ingresado ya está siendo utilizado por otro usuario.",
            // Caso 15: Calificaciones definitivas (Área)
            idx_unique_calif_area_matricula_area: "Ya existe una calificación definitiva registrada para este estudiante en esta área.",
            // Caso 16: Nivelaciones (Área)
            idx_unique_nivelacion_matricula_area: "Este estudiante ya tiene una nivelación registrada para esta área.",
        };

        const indexName = extraerNombreIndiceUnico(error, mensajesUnicidad);

        if (indexName && mensajesUnicidad[indexName]) {
            return new BusinessWarning(mensajesUnicidad[indexName], "Registro duplicado", 409);
        }

        // Fallback amigable sin exponer nombres de columnas ni índices de la BD
        return new BusinessWarning(
            "Ya existe un registro con estos mismos datos en el sistema. Verifica la información e intenta nuevamente.",
            "Registro duplicado",
            409
        );
    }

    // --- Errores de clave foránea ---
    if (error instanceof ForeignKeyConstraintError) {
        if (process.env.NODE_ENV !== "production") {
            console.warn("⚠️ ForeignKeyConstraintError:", error.index || error.table);
        }

        const sql = error.parent?.sql?.toUpperCase() || "";
        const isInsert = sql.includes("INSERT");
        const isUpdate = sql.includes("UPDATE");
        const isDelete = sql.includes("DELETE");

        let message = "No se puede completar la operación porque el registro está relacionado con otros datos del sistema.";
        let title = "Registro relacionado";

        if (isInsert) {
            message = "No se pudo guardar el registro porque algunos datos relacionados no existen o no están disponibles.";
            title = "Datos relacionados inválidos";
        } else if (isUpdate) {
            message = "No se pudo actualizar el registro porque está asociado a otros datos activos en el sistema.";
            title = "No se puede actualizar";
        } else if (isDelete) {
            message = "No se puede eliminar este registro porque está siendo utilizado por otros datos.";
            title = "Registro en uso";
        }

        return new BusinessWarning(message, title, 409);
    }

    // --- Errores de validación de Sequelize ---
    if (error instanceof ValidationError) {
        const primerError = error.errors?.[0];
        const rawMsg = primerError?.message || "";

        // Evitar exponer mensajes técnicos nativos de Sequelize en inglés
        const esMensajeTecnico =
            primerError?.type === "notNull Violation" ||
            /cannot be null|Validation .* failed/i.test(rawMsg);

        const friendlyMessage = esMensajeTecnico
            ? "Faltan datos obligatorios o alguno de los valores ingresados no tiene el formato esperado."
            : rawMsg || "Hay errores en los datos enviados. Revise e intente nuevamente.";

        const err = new BusinessWarning(
            friendlyMessage,
            "Datos inválidos",
            422
        );
        err.errors = error.errors?.map((e) => ({
            field: e.path,
            message: e.type === "notNull Violation"
                ? "Este campo es obligatorio."
                : e.message,
        }));
        return err;
    }

    // --- Otros errores no manejados específicamente ---
    return error;
};