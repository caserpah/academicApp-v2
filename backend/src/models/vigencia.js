import { DataTypes, Op } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Vigencia
 * -----------------
 * Representa un año académico dentro del cual se desarrollan
 * las actividades escolares (matrículas, calificaciones, cargas, etc.).
 *
 * Solo una vigencia puede estar activa.
 */

export const Vigencia = sequelize.define("vigencia", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
    },
    anio: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            isInt: { msg: "El año lectivo debe ser un número entero." },
            min: { args: [2025], msg: "El año lectivo no puede ser menor a 2025." },
        },
    },
    fechaInicio: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: "La fecha de inicio debe tener un formato válido (YYYY-MM-DD)." },
        },
    },
    fechaFin: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: "La fecha de fin debe tener un formato válido (YYYY-MM-DD)." },
            isAfterFechaInicio(value) {
                if (this.fechaInicio && value <= this.fechaInicio) {
                    throw new Error("La fecha de fin debe ser posterior a la fecha de inicio.");
                }
            },
        },
    },
    activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Indica si el año lectivo está abierto (solo uno puede estar activa).",
    }
}, {
    tableName: "vigencias",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        { unique: true, fields: ["anio"], name: "idx_vigencia_anio" },
        { fields: ["activa"], name: "idx_vigencia_activa" },
    ],
});

/**
 * Hook: antes de crear o actualizar
 * - Garantiza que solo una vigencia esté activa a la vez
 */
Vigencia.beforeSave(async (vigencia) => {
    if (vigencia.activa) {
        const existeActiva = await Vigencia.findOne({
            where: {
                activa: true,
                id: { [Op.ne]: vigencia.id || 0 },
            },
        });

        if (existeActiva) {
            throw new Error(
                `Ya existe un año lectivo (${existeActiva.anio}) activo. Debe cerrarlo antes de activar otro.`
            );
        }
    }
});