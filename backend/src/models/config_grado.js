import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const ConfigGrado = sequelize.define("config_grado", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    gradoId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    usaDesempenosMultiples: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    usaRangosNotas: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    periodosPermitidos: {
        type: DataTypes.JSON,
        allowNull: false
    },
    muestraNotaEnBoletin: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "config_grado",
    timestamps: false
});