import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: CoordinadorSedes
 * Relación N:M entre coordinadores y sedes, asociada a una vigencia.
 */
export const CoordinadorSedes = sequelize.define("coordinador_sedes", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    // Relaciones directas
    coordinadorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "coordinadores", key: "id" },
    },
    sedeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "sedes", key: "id" },
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
    },
    jornada: {
        type: DataTypes.ENUM("MAÑANA", "TARDE", "NOCHE", "COMPLETA"),
        allowNull: true, // Null si es Académico
    },
    tipo: {
        type: DataTypes.ENUM("ACADEMICO", "CONVIVENCIA"),
        allowNull: false,
        defaultValue: "ACADEMICO"
    }
}, {
    tableName: "coordinador_sedes",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        // Índice para optimizar búsquedas
        { fields: ["sedeId", "vigenciaId"] },
        { fields: ["coordinadorId"] }
    ],
});