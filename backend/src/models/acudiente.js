import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const Acudiente = sequelize.define("acudiente", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    tipoDocumento: {
        type: DataTypes.ENUM('CC', 'CE', 'PA', 'TI', 'RC'),
        allowNull: false
    },
    documento: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    primerNombre: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    segundoNombre: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    primerApellido: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    segundoApellido: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    fechaNacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    direccion: {
        type: DataTypes.STRING(80),
        allowNull: true
    },
    contacto: {
        type: DataTypes.STRING(12),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(80),
        allowNull: true
    }
}, {
    tableName: "acudientes",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            fields: ["tipoDocumento"],
            name: "idx_tipoDocumento",
        },
        {
            unique: true,
            fields: ["tipoDocumento", "documento"],
            name: "idx_unique_acudiente_documento",
        },
        {
            fields: ["primerApellido", "primerNombre"],
            name: "idx_nombre_apellido",
        },
    ],
});