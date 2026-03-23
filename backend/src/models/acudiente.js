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
    direccion: {
        type: DataTypes.STRING(80),
        allowNull: true
    },
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
            fields: ["usuarioId"],
            name: "idx_unique_usuario_acudiente",
        }
    ],
});