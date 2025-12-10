import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

export const HistorialMatriculas = sequelize.define("historial_matriculas", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    matriculaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "matriculas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Matrícula sobre la cual se registra el movimiento."
    },

    /** ESTADO ANTERIOR Y NUEVO */
    estadoAnterior: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    estadoNuevo: {
        type: DataTypes.STRING(30),
        allowNull: true
    },

    /** GRUPO Δ */
    grupoAnteriorId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    grupoNuevoId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    /** SEDE Δ */
    sedeAnteriorId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    sedeNuevoId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    /** AUDITORÍA DE MOVIMIENTOS */
    usuarioId: {
        type: DataTypes.INTEGER,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true,
        comment: "Usuario que realizó la acción."
    },

    motivo: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "Motivo del traslado o cambio."
    }

}, {
    tableName: "historial_matriculas",
    timestamps: true,
    createdAt: "fechaRegistro",
    updatedAt: false,

    indexes: [
        { fields: ["matriculaId"], name: "idx_historial_matricula" },
        { fields: ["estadoNuevo"], name: "idx_historial_estadoNuevo" },
        { fields: ["grupoNuevoId"], name: "idx_historial_grupoNuevo" },
        { fields: ["usuarioId"], name: "idx_historial_usuario" }
    ]
});