import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Grupo
 * Representa los grupos académicos de cada sede y vigencia.
 */
export const Grupo = sequelize.define("grupo", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    nombre: {
        type: DataTypes.STRING(10),
        allowNull: false
    },

    gradoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "grados", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },

    jornada: {
        type: DataTypes.ENUM("MANANA", "TARDE", "NOCHE", "UNICA"),
        allowNull: false
    },

    cupos: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50,
        comment: "Número máximo de estudiantes permitidos en el grupo."
    },

    sobrecupoPermitido: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Si se permite superar el número de cupos definidos."
    },

    sedeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "sedes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },

    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },

    directorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "docentes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
    }

}, {
    tableName: "grupos",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",

    indexes: [
        {
            unique: true,
            name: "idx_grupo_unico",
            fields: ["nombre", "gradoId", "jornada", "sedeId", "vigenciaId"]
        },
        { fields: ["sedeId"], name: "idx_grupo_sede" },
        { fields: ["gradoId"], name: "idx_grupo_grado" },
        { fields: ["vigenciaId"], name: "idx_grupo_vigencia" },
        { fields: ["cupos"], name: "idx_grupo_cupos" }
    ]
});