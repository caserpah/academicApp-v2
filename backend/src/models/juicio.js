import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Juicio
 * Representa los juicios cualitativos por asignatura, periodo, grado y vigencia.
 */

export const Juicio = sequelize.define("juicio", {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    texto: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    periodo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 4 }
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    gradoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "grados", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },
    dimensionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "dimensiones", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },
    desempenoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "desempenos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },
    asignaturaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "asignaturas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },

    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },
}, {
    tableName: "juicios",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            unique: true,
            name: "idx_juicio_unico",
            fields: [
                "gradoId",
                "periodo",
                "dimensionId",
                "desempenoId",
                "asignaturaId",
                "vigenciaId"
            ]
        }
    ]
});