import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const AcudienteEstudiantes = sequelize.define("acudiente_estudiantes", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    afinidad: {
        type: DataTypes.ENUM(
            "PADRE",
            "MADRE",
            "HERMANO",
            "HERMANA",
            "TIO",
            "TIA",
            "ABUELO",
            "ABUELA",
            "TUTOR",
            "OTRO"
        ),
        allowNull: false,
    },
    // Clave foránea: acudienteId
    acudienteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "acudientes", // nombre de la tabla
            key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },

    // Clave foránea: estudianteId
    estudianteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: "estudiantes", // nombre de la tabla
            key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
}, {
    tableName: "acudiente_estudiantes",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",

    indexes: [
        {
            unique: true,
            fields: ["acudienteId", "estudianteId", "afinidad"],
            name: "idx_acudiente_estudiante_afinidad",
        },
        {
            fields: ["acudienteId"],
            name: "idx_acudienteId",
        },
        {
            fields: ["estudianteId"],
            name: "idx_estudianteId",
        },
    ],
});