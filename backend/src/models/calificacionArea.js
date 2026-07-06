import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: CalificacionArea
 * Almacena la nota definitiva anual ponderada de un estudiante en un ÁREA.
 * Representa el "Período 5" o Consolidado Final. Diseñado para lectura súper
 * rápida al momento de generar los boletines.
 */
export const CalificacionArea = sequelize.define("calificacion_area", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    periodo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        comment: "Periodo 5 representa el consolidado final del año lectivo."
    },
    notaDefinitiva: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Nota acumulada del área (calculada con base en los porcentajes de sus asignaturas)."
    },
    estadoFinal: {
        type: DataTypes.ENUM("APROBADO", "REPROBADO", "NIVELADO"),
        allowNull: false,
        comment: "Estado de aprobación legal del área."
    },
    juicioAcademico: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Observación o juicio general del área para imprimir en el boletín (Opcional)."
    },

    // --- RELACIONES PRINCIPALES ---
    matriculaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "matriculas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Enlaza directamente al estudiante, grado y grupo en el año lectivo."
    },
    areaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "areas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    }
}, {
    tableName: "calificaciones_areas",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        // Índices para velocidad de lectura masiva en los Boletines
        { fields: ["matriculaId"], name: "idx_calificacion_area_matricula" },
        { fields: ["vigenciaId"], name: "idx_calificacion_area_vigencia" },

        // Regla de integridad: Un estudiante (matrícula) solo tiene UNA nota definitiva por Área en el Periodo 5
        {
            unique: true,
            name: "idx_unique_calif_area_matricula_area",
            fields: ["matriculaId", "areaId", "periodo"],
        }
    ]
});