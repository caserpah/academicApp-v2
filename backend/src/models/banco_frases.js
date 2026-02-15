import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: BancoFrases
 * Catálogo de recomendaciones y observaciones estandarizadas.
 */
export const BancoFrases = sequelize.define("banco_frases", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('FORTALEZA', 'DEBILIDAD', 'RECOMENDACION'),
        allowNull: false,
        comment: "Clasificación de la frase para facilitar la búsqueda."
    },
    codigo: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: "Código opcional para búsqueda rápida (ej: F01)."
    },
    texto: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "El contenido de la recomendación."
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "banco_frases",
    timestamps: true,
    indexes: [
        { fields: ["tipo"], name: "idx_banco_frases_tipo" }
    ]
});