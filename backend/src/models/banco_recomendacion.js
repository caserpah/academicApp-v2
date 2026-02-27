import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const BancoRecomendacion = sequelize.define("banco_recomendacion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    categoria: {
        type: DataTypes.ENUM("ACADEMICO", "DISCIPLINAR", "GENERAL"),
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    tipo: {
        type: DataTypes.ENUM("FORTALEZA", "MEJORA"),
        allowNull: true
    }
}, {
    tableName: "banco_recomendaciones",
    timestamps: false
});