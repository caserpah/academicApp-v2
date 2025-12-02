import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const DesempenoRango = sequelize.define("desempeno_rango", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    desempenoId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    minNota: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    maxNota: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: "desempeno_rangos",
    timestamps: false
});