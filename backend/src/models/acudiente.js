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
        allowNull: false,
        unique: true
    },
    lugarExpedicion: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    nombres: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    apellidos: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    direccion: {
        type: DataTypes.STRING(80),
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    fechaNacimiento: {
        type: DataTypes.DATEONLY, // Guarda solo la fecha (YYYY-MM-DD)
        allowNull: true
    },
    // --- EL ENLACE AL SISTEMA AHORA ES OPCIONAL ---
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Permite que un acudiente no tenga cuenta web asociada
        references: {
            model: 'usuarios',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL' // Si borran la cuenta web, los datos del padre siguen intactos
    }
}, {
    tableName: "acudientes",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            unique: true,
            fields: ["documento"],
            name: "idx_documento_acudiente",
        },
        {
            fields: ["tipoDocumento"],
            name: "idx_tipoDocumento",
        },
        {
            unique: true,
            fields: ["usuarioId"],
            name: "idx_unique_usuario_acudiente",
        }
    ],
});