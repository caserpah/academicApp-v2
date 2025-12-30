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

    /** Nombres y apellidos (normalizados a mayúscula) */
    primerNombre: {
        type: DataTypes.STRING(30),
        allowNull: false,
        set(value) {
            this.setDataValue("primerNombre", value?.trim().toUpperCase());
        }
    },
    segundoNombre: {
        type: DataTypes.STRING(30),
        allowNull: true,
        set(value) {
            this.setDataValue("segundoNombre", value ? value.trim().toUpperCase() : null);
        }
    },
    primerApellido: {
        type: DataTypes.STRING(30),
        allowNull: false,
        set(value) {
            this.setDataValue("primerApellido", value?.trim().toUpperCase());
        }
    },
    segundoApellido: {
        type: DataTypes.STRING(30),
        allowNull: true,
        set(value) {
            this.setDataValue("segundoApellido", value ? value.trim().toUpperCase() : null);
        }
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