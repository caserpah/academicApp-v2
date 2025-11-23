import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const Colegio = sequelize.define('colegio', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    registroDane: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: false,
        validate: {
            isAlphanumeric: {
                msg: "El registro DANE solo debe contener caracteres alfanuméricos."
            }
        }
    },
    nombre: {
        type: DataTypes.STRING(80),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(80),
        allowNull: true
    },
    contacto: {
        type: DataTypes.STRING(12),
        allowNull: true,
    },
    direccion: {
        type: DataTypes.STRING(80),
        allowNull: false
    },
    ciudad: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    departamento: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    resolucion: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    fechaResolucion: {
        type: DataTypes.DATEONLY,
    },
    promocion: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    fechaPromocion: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    secretaria: {
        type: DataTypes.STRING(80),
        allowNull: false
    },
    ccSecretaria: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    director: {
        type: DataTypes.STRING(80),
        allowNull: false
    },
    ccDirector: {
        type: DataTypes.STRING(15),
        allowNull: false
    }
}, {
    // Opciones adicionales del modelo
    tableName: 'colegios', // Nombre de la tabla en la base de datos
    timestamps: true, // Habilita createdAt y updatedAt automáticamente
    createdAt: 'fechaCreacion', // Renombra el campo createdAt
    updatedAt: 'fechaActualizacion' // Renombra el campo updatedAt
});