import { DataTypes, TIME } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Matrícula / Prematrícula
 * Representa tanto la inscripción formal de un estudiante en una vigencia
 * como el registro previo de intención de continuidad (prematrícula).
 */
export const Matricula = sequelize.define("matricula", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    folio: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    fechaHora: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    repitente: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    nuevo: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    },
    metodologia: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "Tradicional"
    },
    situacion: {
        type: DataTypes.ENUM("NV", "AP", "RP", "NC"),
        allowNull: false
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM("PREMATRICULA", "MATRICULA"),
        allowNull: false,
        defaultValue: "MATRICULA",
        comment: "Define si el registro corresponde a una matrícula definitiva o una prematrícula.",
    },
    confirmada: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Indica si la prematrícula ha sido confirmada como matrícula oficial.",
    },
    usuarioCreacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Usuario que creó o generó la matrícula o prematrícula.",
    },
    usuarioActualizacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Usuario que realizó la última modificación o confirmó la matrícula.",
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    vigenciaDestinoId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "Aplica solo para prematrículas, define la vigencia futura.",
    },
    estudianteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "estudiantes", key: "id" },
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
    sedeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "sedes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
}, {
    tableName: "matriculas",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        { fields: ["fechaHora"], name: "idx_matricula_fechaHora" },
        { fields: ["estudianteId"], name: "idx_matricula_estudianteId" },
        { fields: ["grupoId"], name: "idx_matricula_grupoId" },
        { fields: ["vigenciaId"], name: "idx_matricula_vigenciaId" },
        { fields: ["vigenciaDestinoId"], name: "idx_matricula_vigenciaDestinoId" },
        { fields: ["activo"], name: "idx_matricula_activo" },
        { fields: ["tipo"], name: "idx_matricula_tipo" },

        // Evita duplicidad del mismo estudiante en la misma vigencia
        {
            unique: true,
            name: "idx_unique_estudiante_vigencia_tipo",
            fields: ["estudianteId", "vigenciaId", "tipo"],
        },

        // Permite buscar fácilmente prematrículas confirmadas o pendientes
        {
            name: "idx_tipo_confirmada_vigencia",
            fields: ["tipo", "confirmada", "vigenciaDestinoId"],
        },
    ],
});