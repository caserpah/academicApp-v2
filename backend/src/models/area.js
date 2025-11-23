import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo Sequelize para la tabla 'areas'.
 * Representa las áreas académicas (Ej: Matemáticas, Ciencias Sociales)
 * de la institución en una vigencia.
 */

export const Area = sequelize.define("area", {
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
            if (!value || value.trim() === "") {
                throw new Error("El código del área no puede estar vacío.");
            }
            this.setDataValue("codigo", value.toUpperCase().trim());
        }
    },
    nombre: {
        type: DataTypes.STRING(60),
        allowNull: false,
        // Aplicamos SET para mayúsculas
        set(value) {
            if (!value || value.trim() === "") {
                throw new Error("El nombre del área no puede estar vacío.");
            }
            this.setDataValue("nombre", value.toUpperCase().trim());
        }
    },
    abreviatura: {
        type: DataTypes.STRING(6),
        allowNull: false,
        // Aplicamos SET para mayúsculas
        set(value) {
            if (!value || value.trim() === "") {
                throw new Error("La abreviatura del área no puede estar vacía.");
            }
            this.setDataValue("abreviatura", value.toUpperCase().trim());
        }
    },
    promociona: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
}, {
    tableName: "areas",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            unique: true,
            name: "idx_area_codigo_vigencia",
            fields: ["codigo", "vigenciaId"],
        },
        {
            unique: true,
            name: "idx_area_nombre_vigencia",
            fields: ["nombre", "vigenciaId"],
        },
        { fields: ["vigenciaId"] },
    ],
});