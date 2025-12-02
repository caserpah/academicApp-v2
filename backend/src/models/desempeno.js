import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const Desempeno = sequelize.define("desempeno", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: { // BAJO, BASICO, ALTO, SUPERIOR, UNICO
        type: DataTypes.STRING,
        allowNull: false
    },
    codigo: { // BJ, BS, AL, SU, UN
        type: DataTypes.STRING,
        allowNull: false
    },
    orden: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "desempenos",
    timestamps: false
});