import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: CoordinadorSedes
 * Relación N:M entre coordinadores y sedes, asociada a una jornada y vigencia.
 */
export const CoordinadorSedes = sequelize.define("coordinador_sedes", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    jornada: {
        type: DataTypes.ENUM("MANANA", "TARDE", "NOCHE", "COMPLETA"),
        allowNull: false,
        defaultValue: "MANANA",
        comment: "Jornada asignada al coordinador dentro de la sede",
    },
    // Relaciones directas
    coordinadorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "coordinadores", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
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
}, {
    tableName: "coordinador_sedes",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            unique: true,
            name: "uq_sede_jornada_vigencia",
            fields: ["sedeId", "jornada", "vigenciaId"],
        },
        { fields: ["vigenciaId"] },
        { fields: ["sedeId"] },
        { fields: ["coordinadorId"] },
    ],
});