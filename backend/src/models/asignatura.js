import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Asignatura
 * Representa las asignaturas de cada área en una vigencia.
 */
export const Asignatura = sequelize.define("asignatura", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING(6),
        allowNull: false,
        // Aplicamos SET para mayúsculas
        set(value) {
            this.setDataValue(
                'codigo',
                typeof value === 'string' && value.trim() !== ''
                    ? value.toUpperCase().trim()
                    : null
            );
        }
    },
    nombre: {
        type: DataTypes.STRING(60),
        allowNull: false,
        // Aplicamos SET para mayúsculas
        set(value) {
            this.setDataValue(
                'nombre',
                typeof value === 'string' && value.trim() !== ''
                    ? value.toUpperCase().trim()
                    : null
            );
        }
    },
    nombreCorto: {
        type: DataTypes.STRING(15),
        allowNull: false,
        // Aplicamos SET para mayúsculas
        set(value) {
            this.setDataValue(
                'nombreCorto',
                typeof value === 'string' && value.trim() !== ''
                    ? value.toUpperCase().trim()
                    : null
            );
        }
    },
    abreviatura: {
        type: DataTypes.STRING(6),
        allowNull: false,
        // Aplicamos SET para mayúsculas
        set(value) {
            this.setDataValue(
                'abreviatura',
                typeof value === 'string' && value.trim() !== ''
                    ? value.toUpperCase().trim()
                    : null
            );
        }
    },
    porcentual: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    areaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "areas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
}, {
    tableName: "asignaturas",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            unique: true,
            name: "idx_asignatura_codigo_vigencia",
            fields: ["codigo", "vigenciaId"],
        },
        {
            unique: true,
            name: "idx_asignatura_nombre_area_vigencia",
            fields: ["nombre", "areaId", "vigenciaId"],
        },
        { fields: ["areaId"] },
        { fields: ["vigenciaId"] },
    ],
});