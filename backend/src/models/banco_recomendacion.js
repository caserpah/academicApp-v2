import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const BancoRecomendacion = sequelize.define("banco_recomendacion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    titulo: { // Ej: "Felicitación", "Atención"
        type: DataTypes.STRING,
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "banco_recomendaciones",
    timestamps: false
});