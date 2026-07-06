import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Nivelacion
 * Almacena el resultado anual del estudiante en una área específica que perdió,
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
        comment: "Promedio ponderado del área con el que perdió."
    },
    detalleAsignaturas: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: "JSON con el resumen de las asignaturas perdidas que provocaron la pérdida del área. Útil para el docente."
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
        type: DataTypes.ENUM("APROBADO", "REPROBADO", "NIVELADO", "PENDIENTE"),
        allowNull: false,
        defaultValue: "PENDIENTE",
        comment: "El estado empieza en PENDIENTE hasta que se suba el acta."
    },
    fecha_nivelacion: {
        type: DataTypes.DATE,
        allowNull: true
    },
    observacion_nivelacion: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    url_evidencia_nivelacion: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Ruta al acta PDF (Max 2MB)"
    },

    // --- RELACIONES OBLIGATORIAS ---
    matriculaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "matriculas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Enlaza al estudiante, grupo, sede y vigencia."
    },
    areaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "areas", key: "id" },
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
    },
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" }
    }
}, {
    tableName: "nivelaciones",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        // Un estudiante (vía su matrícula) solo tiene un registro de nivelación por área
        {
            unique: true,
            name: "idx_unique_nivelacion_matricula_area",
            fields: ["matriculaId", "areaId"],
        },
        // Índices para búsquedas rápidas en la promoción masiva
        { fields: ["matriculaId"], name: "idx_nivelacion_matricula" },
        { fields: ["estadoFinal"], name: "idx_nivelacion_estadoFinal" }
    ]
});