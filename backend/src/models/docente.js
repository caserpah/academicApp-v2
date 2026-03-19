import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";
import { Usuario } from "./usuario.js";

/**
 * Modelo: Docente
 * -----------------
 * Representa a los profesores de la institución.
 * Cada docente pertenece a un área de conocimiento.
 */

export const Docente = sequelize.define("docente", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    fechaNacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    nivelEducativo: {
        type: DataTypes.ENUM("NS", "TC", "LC", "PF", "MA", "DO", "OT"),
        allowNull: false,
        validate: {
            isIn: {
                args: [["NS", "TC", "LC", "PF", "ES", "MA", "DO", "OT"]],
                msg: "Nivel educativo inválido.",
            },
        },
        comment: "NS: Normalista Superior, TC: Técnico o Tecnólogo en Educación, LC: Licenciatura, PF: Profesional, ES: Especialista, MA: Maestría, DO: Doctorado, OT: Otro"
    },

    profesion: {
        type: DataTypes.STRING(100),
        allowNull: true
    },

    nivelEnsenanza: {
        type: DataTypes.ENUM("PE", "BP", "BS", "MA", "OT"),
        allowNull: false,
        validate: {
            isIn: {
                args: [["PE", "BP", "BS", "MA", "OT"]],
                msg: "Nivel de enseñanza inválido.",
            },
        },
        comment: "PE: Preescolar, BP: Básica Primaria, BS: Básica Secundaria, MA: Media Académica, OT: Otro"
    },

    decretoLey: {
        type: DataTypes.STRING(10),
        allowNull: true
    },

    escalafon: {
        type: DataTypes.STRING(10),
        allowNull: true
    },

    decretoNombrado: {
        type: DataTypes.STRING(10),
        allowNull: true
    },

    fechaNombrado: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    vinculacion: {
        type: DataTypes.ENUM("PD", "PP", "PV", "TR", "OT"),
        allowNull: false,
        validate: {
            isIn: {
                args: [["PD", "PP", "PV", "TR", "OT"]],
                msg: "Tipo de vinculación inválido.",
            },
        },
        comment: "PD: Propiedad, PP: Periodo de Prueba, PV: Provisionalidad, TR: Temporalidad, OT: Otro"
    },

    fechaIngreso: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    fechaRetiro: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },

    direccion: {
        type: DataTypes.STRING(150),
        allowNull: true
    },

    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },

    areaEnsenanza: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "Sin Especificar"
    },

    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true, // Esto obliga a nivel base de datos que sea 1 a 1
        references: {
            model: 'usuarios', // Nombre exacto de la tabla de usuarios en BD
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    }
}, {
    tableName: "docentes",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        { unique: true, fields: ["usuarioId"], name: "idx_usuario_docente" },
        { fields: ["nivelEducativo"], name: "idx_nivelEducativo" },
        { fields: ["nivelEnsenanza"], name: "idx_nivelEnsenanza" },
        { fields: ["vinculacion"], name: "idx_vinculacion" },
        { fields: ["activo"], name: "idx_activo_docente" }
    ],
});