import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const Coordinador = sequelize.define('coordinador', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    documento: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true,
        validate: {
            isNumeric: {
                msg: "El documento solo debe contener dígitos numéricos."
            }
        }
    },
    nombre: {
        type: DataTypes.STRING(80),
        allowNull: false // El nombre es obligatorio
    },
    email: {
        type: DataTypes.STRING(80),
        allowNull: true // El email es opcional
    },
    telefono: {
        type: DataTypes.STRING(12),
        allowNull: true // El teléfono es opcional
    },
    direccion: {
        type: DataTypes.STRING(80),
        allowNull: true
    }
}, {
    // Opciones adicionales del modelo
    tableName: 'coordinadores', // Nombre de la tabla en la base de datos
    timestamps: true, // Habilita createdAt y updatedAt automáticamente
    createdAt: 'fechaCreacion', // Renombra el campo createdAt
    updatedAt: 'fechaActualizacion' // Renombra el campo updatedAt
});