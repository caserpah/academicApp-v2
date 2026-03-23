import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Matricula
 * Representa una matrícula académica
 */
export const Matricula = sequelize.define("matricula", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    /** FOLIO AUTOGENERADO */
    folio: {
        type: DataTypes.STRING(25),
        allowNull: false,
        comment: "Código único de matrícula. Se genera automáticamente (MAT-AAAA-XXXXX)."
    },

    /** FECHA/HORA DE CREACIÓN */
    fechaHora: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },

    /** ESTADO OFICIAL DE LA MATRÍCULA */
    estado: {
        type: DataTypes.ENUM(
            "PREMATRICULADO",
            "ACTIVA",
            "RETIRADO",
            "DESERTADO",
            "REPROBADO",
            "ANULADO",
            "PROMOVIDO"
        ),
        allowNull: false,
        defaultValue: "PREMATRICULADO",
        comment: "Estado administrativo de la matrícula según proceso institucional."
    },

    metodologia: {
        type: DataTypes.ENUM(
            "TRADICIONAL",
            "ETNOEDUCACION",
            "ESCUELA_NUEVA",
            "ACELERACION_APRENDIZAJE"
        ),
        allowNull: true,
        defaultValue: "TRADICIONAL"
    },

    bloqueo_notas: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Si es true, no permite ingresar notas (ej: por inasistencia)."
    },

    es_nuevo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Indica si el estudiante es nuevo en la institución."
    },

    es_repitente: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Indica si el estudiante está repitiendo el grado."
    },

    situacion_ano_anterior: {
        type: DataTypes.ENUM(
            "NO_ESTUDIO",
            "APROBO",
            "REPROBO",
            "NO_CULMINO",
            "SIN_INFO"
        ),
        allowNull: false,
        defaultValue: "APROBO",
        comment: "Situación académica del año inmediatamente anterior."
    },

    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Observaciones adicionales sobre la matrícula."
    },

    /** DATOS DE RETIRO */
    fechaRetiro: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Fecha en que se retira oficialmente al estudiante."
    },

    motivoRetiro: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: "Razón del retiro o deserción."
    },

    usuarioRetiro: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
    },

    /** AUDITORÍA */
    usuarioCreacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
    },

    usuarioActualizacion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
    },

    /** REFERENCIAS PRINCIPALES */
    estudianteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "estudiantes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },

    grupoId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "grupos", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },

    sedeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "sedes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },

    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    },

}, {
    tableName: "matriculas",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",

    indexes: [
        { fields: ["estudianteId"], name: "idx_matricula_estudiante" },
        { fields: ["grupoId"], name: "idx_matricula_grupo" },
        { fields: ["sedeId"], name: "idx_matricula_sede" },
        { fields: ["vigenciaId"], name: "idx_matricula_vigencia" },
        { fields: ["estado"], name: "idx_matricula_estado" },
        { fields: ["metodologia"], name: "idx_matricula_metodologia" },

        /** UN ESTUDIANTE SOLO PUEDE TENER UNA MATRÍCULA POR VIGENCIA */
        {
            unique: true,
            name: "idx_unique_estudiante_vigencia",
            fields: ["estudianteId", "vigenciaId"]
        },
        {
            unique: true,
            name: "idx_unique_matricula_folio",
            fields: ["folio"]
        }
    ]
});