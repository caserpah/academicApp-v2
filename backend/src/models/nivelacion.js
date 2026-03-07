import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Nivelacion
 * Almacena el resultado anual del estudiante en una asignatura,
 * enlazado directamente a su matrícula. Gestiona el proceso de
 * recuperación con sus evidencias legales.
 */
export const Nivelacion = sequelize.define("nivelacion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    notaDefinitivaOriginal: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Promedio matemático real con el que terminó el año/ciclo."
    },
    estadoOriginal: {
        type: DataTypes.ENUM("APROBADO", "REPROBADO"),
        allowNull: false,
        comment: "Estado antes de cualquier nivelación."
    },
    notaNivelacion: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: "Nota obtenida en el examen de recuperación."
    },
    notaFinalLegal: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Nota definitiva final (Máximo 3.0 si fue nivelado)."
    },
    estadoFinal: {
        type: DataTypes.ENUM("APROBADO", "REPROBADO", "NIVELADO"),
        allowNull: false,
        comment: "Estado definitivo que leerá el motor de promoción."
    },
    fecha_nivelacion: {
        type: DataTypes.DATE,
        allowNull: true
    },
    observacion_nivelacion: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Comentarios del docente sobre el proceso de nivelación."
    },
    url_evidencia_nivelacion: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Ruta al acta física o examen (ej: uploads/evidencias/acta-123.pdf)"
    },

    // --- RELACIONES OBLIGATORIAS ---
    matriculaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "matriculas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE", // Si se elimina la matrícula (error de digitación), se borra esto.
        comment: "Enlaza al estudiante, grupo, sede y vigencia."
    },
    asignaturaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "asignaturas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },
    docenteId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "docentes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Docente que subió la nota de nivelación."
    }
}, {
    tableName: "nivelaciones",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        // Un estudiante (vía su matrícula) solo tiene un registro de nivelación por asignatura
        {
            unique: true,
            name: "idx_unique_nivelacion_matricula_asignatura",
            fields: ["matriculaId", "asignaturaId"],
        },
        // Índices para búsquedas rápidas en la promoción masiva
        { fields: ["matriculaId"], name: "idx_nivelacion_matricula" },
        { fields: ["estadoFinal"], name: "idx_nivelacion_estadoFinal" }
    ]
});