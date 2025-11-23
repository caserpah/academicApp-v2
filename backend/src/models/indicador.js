import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Indicador
 * Descripción mínima del periodo por vigencia
 */

export const Indicador = sequelize.define("indicador", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },

    periodo: {
        type: DataTypes.TINYINT,
        allowNull: false,
        validate: {
            min: { args: [1], msg: "El periodo debe estar entre 1 y 4." },
            max: { args: [4], msg: "El periodo debe estar entre 1 y 4." }
        }
    },

    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: "La descripción del indicador es obligatoria.",
            },
            len: {
                args: [10, 2000],
                msg: "La descripción del indicador debe tener al menos 10 caracteres.",
            },
        },
    },

    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Controla si el indicador está disponible para nuevas calificaciones.",
    },

    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
}, {
    tableName: "indicadores",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            unique: true,
            name: "idx_indicador_periodo_vigencia",
            fields: ["periodo", "vigenciaId"]
        },
        { fields: ["vigenciaId"] }
    ]
});