import {
    UniqueConstraintError,
    ForeignKeyConstraintError,
    ValidationError,
} from "sequelize";

/**
 * 🌐 Manejo centralizado de errores Sequelize
 * -------------------------------------------
 * Traduce los mensajes técnicos de Sequelize a textos naturales y comprensibles.
 * Funciona como red de seguridad para todos los modelos del sistema.
 */
export const handleSequelizeError = (error) => {

    // --- Errores de violación de unicidad ---
    if (error instanceof UniqueConstraintError) {

        const indexName = Object.keys(error.fields || {})[0] || null;

        // Caso 1: coordinador_sedes (coordinador + sede + jornada + vigencia)
        if (indexName === "uq_sede_jornada_vigencia") {
            const err = new Error(
                "Este coordinador ya está asignado a esta sede en la jornada seleccionada para el año lectivo."
            );
            err.status = 409;
            return err;
        }

        // Caso 2: Cargas (grupo + asignatura + vigencia)
        if (indexName === "uq_carga_grupo_asignatura_vigencia") {
            const err = new Error(
                "Esta asignatura ya está asignada a este grupo para el año lectivo."
            );
            err.status = 409;
            return err;
        }

        // Caso 3: acudientes-estudiantes (acudienteId + estudianteId)
        if (indexName === "uq_acudiente_estudiante") {
            const err = new Error(
                "Este acudiente ya está asociado a este estudiante."
            );
            err.status = 409;
            return err;
        }

        // Caso 4: areas-vigencias (areaId + nombre + vigenciaId)
        if (indexName === "idx_area_codigo_vigencia") {
            const err = new Error("Ya existe un área con este código en el año lectivo vigente.");
            err.status = 409;
            return err;
        }

        if (indexName === "idx_area_nombre_vigencia") {
            const err = new Error("Ya existe un área con este nombre en el año lectivo vigente.");
            err.status = 409;
            return err;
        }

        // Caso 5: asignaturas + areas (codigo + nombre + areaId + vigenciaId)
        if (indexName === "idx_asignatura_codigo_vigencia") {
            const err = new Error("Ya existe una asignatura con este código en el año lectivo.");
            err.status = 409;
            return err;
        }

        if (indexName === "idx_asignatura_nombre_area_vigencia") {
            const err = new Error("Ya existe una asignatura perteneciente a esta área para el año lectivo.");
            err.status = 409;
            return err;
        }

        /* Caso 6: indicador + periodo + vigenciaId
        if (indexName === "idx_indicador_periodo_vigencia") {
            const err = new Error("Ya existe un indicador registrado para este periodo en el año lectivo.");
            err.status = 409;
            return err;
        }*/

        // Caso 7: Especial para Juicios
        if (indexName === "idx_juicio_unico") {
            const err = new Error(
                "Ya existe un juicio para este periodo, grado y desempeño en esta asignatura."
            );
            err.status = 409;
            return err;
        }

        // Caso 8: Especial para Grupos
        if (indexName === "idx_grupo_unico") {
            const err = new Error(
                "No se puede crear el grupo porque ya existe otro grupo con el mismo nombre, grado, jornada, sede y vigencia."
            );
            err.status = 409;
            return err;
        }

        // Caso general: Fallback genérico para claves únicas simples
        const field = error?.errors?.[0]?.path || "campo";
        const value = error?.errors?.[0]?.value || "";

        const err = new Error(
            `Ya existe un registro con este ${field}: ${value}.`
        );
        err.status = 409;
        return err;
    }

    // --- Errores de clave foranea ---
    if (error instanceof ForeignKeyConstraintError) {
        console.error("ForeignKeyConstraintError:", error);

        // Detectar operación (INSERT / UPDATE / DELETE)
        const sql = error.parent?.sql?.toUpperCase() || "";

        const isInsert = sql.includes("INSERT");
        const isUpdate = sql.includes("UPDATE");
        const isDelete = sql.includes("DELETE");

        let message = "Existe un conflicto con una clave foránea.";

        if (isInsert) {
            message = "No se pudo crear el registro porque algunos datos relacionados no existen o no son válidos.";
        }
        else if (isUpdate) {
            message = "No se pudo actualizar el registro porque los datos relacionados no existen o están siendo usados por otros registros.";
        }
        else if (isDelete) {
            message = "No se puede eliminar este registro porque está siendo utilizado por otros datos.";
        }

        const err = new Error(message);
        err.status = 409;
        return err;
    }

    // --- Errores de validación de Sequelize ---
    if (error instanceof ValidationError) {
        const err = new Error(
            error.errors?.[0]?.message ||
            "Hay errores en los datos enviados. Revise e intente nuevamente."
        );
        err.status = 422;
        err.errors = error.errors?.map((e) => ({
            field: e.path,
            message: e.message,
        }));
        return err;
    }

    // --- Otros errores no manejados específicamente ---
    return error;
};