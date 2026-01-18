

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
        console.log("⚠️ EL NOMBRE DEL ÍNDICE QUE FALLA ES:", indexName);

        // Caso 1: coordinador_sedes (coordinador + sede + vigencia)
        if (indexName === "uq_sede_vigencia") {
            const err = new Error(
                "Este coordinador ya está asignado a esta sede para el año lectivo."
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
            const err = new Error("No es posible guardar el área. El código ingresado ya está siendo utilizado por otra área en este año lectivo.");
            err.status = 409;
            return err;
        }

        if (indexName === "idx_area_nombre_vigencia") {
            const err = new Error("No es posible crear el área. Ya existe un área con el mismo nombre asignado al año lectivo vigente.");
            err.status = 409;
            return err;
        }

        // Caso 5: asignaturas + areas (codigo + nombre + areaId + vigenciaId)
        if (indexName === "idx_asignatura_codigo_vigencia") {
            const err = new Error("No es posible guardar la asignatura. El código ingresado ya está siendo utilizado por otra asignatura en este año lectivo.");
            err.status = 409;
            return err;
        }

        if (indexName === "idx_asignatura_nombre_area_vigencia") {
            const err = new Error("No es posible guardar la asignatura. Ya existe otro registro con esta asignatura asociado a la misma área en este año lectivo.");
            err.status = 409;
            return err;
        }

        // Caso 7: El índice que está fallando es "coordinadorId"
        if (indexName === "coordinadorId") {
            const err = new Error(
                "El Coordinador ya cuenta con una coordinación asignada para la sede y el año lectivo seleccionados."
            );
            err.status = 409;
            return err;
        }

        // Caso 7: Especial para Juicios
        if (indexName === "idx_juicio_unico") {
            const err = new Error("No es posible guardar el juicio. Ya existe un juicio registrado para esta asignatura con el mismo período, grado y nivel de desempeño.");
            err.status = 409;
            return err;
        }

        // Caso 8: Especial para Grupos
        if (indexName === "idx_grupo_unico") {
            const err = new Error("No es posible guardar el grupo. Ya existe un grupo registrado con el mismo nombre, grado, jornada, sede y vigencia.");
            err.status = 409;
            return err;
        }
        // Caso 9: Especial para Cargas
        if (indexName === "idx_carga_sede_grupo_asignatura_vigencia") {
            const err = new Error("No es posible guardar la carga académica. Ya existe una carga académica con esta asignatura en el mismo grupo de la misma sede para este año lectivo.");
            err.status = 409;
            return err;
        }

        // Caso 10: Especial para matriculas
        if (indexName === "idx_unique_estudiante_vigencia") {
            const err = new Error("No es posible crear la matrícula. Ya existe una matrícula registrada para este estudiante en el mismo año lectivo.");
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
            message = "No se pudo guardar el registro porque algunos datos relacionados no existen o no son válidos.";
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