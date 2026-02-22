import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: VentanaCalificacion
 * ---------------------------
 * Controla la apertura y cierre de los periodos de calificación.
 */
export const VentanaCalificacion = sequelize.define("ventana_calificacion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    periodo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: { args: [1], msg: "El periodo debe ser mínimo 1." },
            max: { args: [4], msg: "El periodo no puede ser mayor que 4." },
        },
    },
    fechaInicio: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: "La fecha de inicio debe ser una fecha válida." },
        },
    },
    fechaFin: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: "La fecha de fin debe ser una fecha válida." },
        },
    },
    habilitada: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Indica si la ventana está abierta para los docentes.",
    },
    descripcion: {
        type: DataTypes.STRING(150),
        allowNull: true,
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
}, {
    tableName: "ventanas_calificacion",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            unique: true,
            name: "idx_unique_periodo_vigencia",
            fields: ["periodo", "vigenciaId"],
        },
    ],
});