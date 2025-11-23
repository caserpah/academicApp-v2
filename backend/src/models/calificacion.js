import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Calificación
 * Registra las notas y juicios por estudiante, asignatura, período y vigencia.
 */
export const Calificacion = sequelize.define("calificacion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    periodo: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    notaAcademica: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    promedioAcademica: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    juicioAcademica: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    notaAcumulativa: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    promedioAcumulativa: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    juicioAcumulativa: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    notaLaboral: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    promedioLaboral: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    juicioLaboral: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    notaSocial: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    promedioSocial: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    juicioSocial: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    notaDefinitiva: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    recomendacionUno: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    recomendacionDos: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fallas: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    estudianteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "estudiantes", key: "id" },
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
    tableName: "calificaciones",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        { fields: ["periodo"], name: "idx_calificacion_periodo" },
        { fields: ["estudianteId"], name: "idx_calificacion_estudianteId" },
        { fields: ["asignaturaId"], name: "idx_calificacion_asignaturaId" },
        { fields: ["vigenciaId"], name: "idx_calificacion_vigenciaId" },
        {
            unique: true,
            name: "idx_unique_calificacion_periodo_estudiante_asignatura_vigencia",
            fields: ["periodo", "estudianteId", "asignaturaId", "vigenciaId"],
        },
        { fields: ["notaDefinitiva"], name: "idx_calificacion_notaDefinitiva" },
    ],
});