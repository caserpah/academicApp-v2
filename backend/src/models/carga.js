import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Carga
 * Representa la asignación académica de docentes, grupos y asignaturas
 * en una sede durante una vigencia.
 */
export const Carga = sequelize.define("carga", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: false,
        set(value) {
            if (typeof value === "string") {
                this.setDataValue("codigo", value.toUpperCase().trim());
            } else {
                this.setDataValue("codigo", value);
            }
        }
    },
    horas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: {
                args: [1],
                msg: "Las horas asignadas deben ser mínimo 1."
            },
            max: {
                args: [40],
                msg: "Las horas asignadas no pueden superar 40."
            }
        }
    },
    sedeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "sedes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    docenteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "docentes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    grupoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "grupos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    asignaturaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "asignaturas", key: "id" },
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
    tableName: "cargas",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        { fields: ["sedeId"], name: "idx_carga_sedeId" },
        { fields: ["docenteId"], name: "idx_carga_docenteId" },
        { fields: ["grupoId"], name: "idx_carga_grupoId" },
        { fields: ["asignaturaId"], name: "idx_carga_asignaturaId" },

        {
            unique: true,
            name: "idx_carga_sede_grupo_asignatura_vigencia",
            fields: ["sedeId", "grupoId", "asignaturaId", "vigenciaId"],
        },

        // Código único por vigencia
        {
            unique: true,
            name: "idx_carga_codigo_vigencia",
            fields: ["codigo", "vigenciaId"],
        },
    ],
});