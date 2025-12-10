import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const Grado = sequelize.define("grado", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    modalidad: {
        type: DataTypes.ENUM("REGULAR", "ADULTOS"),
        allowNull: false
    },
    nivelAcademico: {
        type: DataTypes.ENUM("PREESCOLAR", "PRIMARIA", "SECUNDARIA", "MEDIA"),
        allowNull: false
    },
    equivalenciaMin: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    equivalenciaMax: {
        type: DataTypes.INTEGER,
        allowNull: true
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
    tableName: "grados",
    timestamps: false
});