import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Sede
 * Representa una sede institucional
 */
export const Sede = sequelize.define("sede", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        validate: {
            isAlphanumeric: {
                msg: "El código de la sede solo debe contener caracteres alfanuméricos."
            }
        }
    },
    nombre: {
        type: DataTypes.STRING(60),
        allowNull: false, // El nombre es obligatorio
        validate: {
            notEmpty: {
                msg: "El nombre de la sede es obligatorio."
            }
        }
    },
    direccion: {
        type: DataTypes.STRING(80),
        allowNull: false,
    },
    contacto: {
        type: DataTypes.STRING(12),
        allowNull: true, // El contacto es opcional
    },
    colegioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "colegios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
}, {
    tableName: "sedes",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            unique: true,
            name: "idx_sede_codigo_unico",
            fields: ["codigo"],
        },
        { fields: ["colegioId"] },
    ],
});