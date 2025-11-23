import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Juicio
 * Representa los juicios cualitativos por asignatura, periodo, grado y vigencia.
 */

export const Juicio = sequelize.define("juicio", {

    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    tipo: {
        type: DataTypes.ENUM("CUANTITATIVO", "CUALITATIVO"),
        allowNull: false
    },

    grado: {
        type: DataTypes.ENUM(
            "PRE_JARDIN", "JARDIN", "TRANSICION", "PRIMERO",
            "SEGUNDO", "TERCERO", "CUARTO", "QUINTO", "SEXTO",
            "SEPTIMO", "OCTAVO", "NOVENO", "DECIMO", "ONCE",
            "CICLO_III", "CICLO_IV", "CICLO_V", "CICLO_VI"
        ),
        allowNull: false
    },

    periodo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1, max: 4 }
    },

    dimension: {
        type: DataTypes.ENUM("ACADEMICA", "ACUMULATIVA", "SOCIAL", "LABORAL"),
        allowNull: false
    },

    /** Desempeño: BAJO/BASICO/ALTO/SUPERIOR o UNICO para primaria/secundaria */
    desempeno: {
        type: DataTypes.ENUM("BAJO", "BASICO", "ALTO", "SUPERIOR", "UNICO"),
        allowNull: false
    },

    /** Rangos numéricos para desempeño */
    minNota: {
        type: DataTypes.FLOAT,
        allowNull: true
    },

    maxNota: {
        type: DataTypes.FLOAT,
        allowNull: true
    },

    /** Texto del juicio */
    texto: {
        type: DataTypes.TEXT,
        allowNull: false
    },

    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },

    /** Es null cuando el juicio es global (acumulativa) */
    asignaturaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "asignaturas", key: "id" },
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
    tableName: "juicios",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        {
            // Juicio único por combinación lógica
            // (Evita duplicados innecesarios)
            unique: true,
            name: "idx_juicio_unico",
            fields: [
                "tipo",
                "grado",
                "periodo",
                "dimension",
                "desempeno",
                "asignaturaId",
                "vigenciaId"
            ]
        },
    ]
});