import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Estudiante
 * ------------------
 * Representa a los estudiantes de la institución educativa.
 */

export const Estudiante = sequelize.define("estudiante", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    /** Documento */
    tipoDocumento: {
        type: DataTypes.ENUM("RC", "TI", "CC", "CE", "PA", "NIP", "NUIP", "NES"),
        allowNull: false
    },
    documento: {
        type: DataTypes.STRING(20),
        allowNull: false
    },

    /** Nombres y apellidos (normalizados a mayúscula) */
    primerNombre: {
        type: DataTypes.STRING(30),
        allowNull: false,
        set(value) {
            this.setDataValue("primerNombre", value?.trim().toUpperCase());
        }
    },
    segundoNombre: {
        type: DataTypes.STRING(30),
        allowNull: true,
        set(value) {
            this.setDataValue("segundoNombre", value ? value.trim().toUpperCase() : null);
        }
    },
    primerApellido: {
        type: DataTypes.STRING(30),
        allowNull: false,
        set(value) {
            this.setDataValue("primerApellido", value?.trim().toUpperCase());
        }
    },
    segundoApellido: {
        type: DataTypes.STRING(30),
        allowNull: true,
        set(value) {
            this.setDataValue("segundoApellido", value ? value.trim().toUpperCase() : null);
        }
    },

    /** Fecha de nacimiento (validación no futura) */
    fechaNacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },

    /** Sexo (ENUM simplificado) */
    sexo: {
        type: DataTypes.ENUM("M", "F", "I"),
        allowNull: false,
        comment: "M: Masculino, F: Femenino, I: Intersexual"
    },

    /** Información de salud y caracterización */
    rh: {
        type: DataTypes.STRING(4),
        allowNull: true
    },

    /** Ubicación (normalizada a mayúscula) */
    direccion: {
        type: DataTypes.STRING(80),
        allowNull: true,
        set(value) {
            this.setDataValue("direccion", value ? value.trim().toUpperCase() : null);
        }
    },
    barrio: {
        type: DataTypes.STRING(60),
        allowNull: true,
        set(value) {
            this.setDataValue("barrio", value ? value.trim().toUpperCase() : null);
        }
    },

    contacto: {
        type: DataTypes.STRING(12),
        allowNull: true
    },

    estrato: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    sisben: {
        type: DataTypes.STRING(40),
        allowNull: true
    },

    subsidiado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },

    eps: {
        type: DataTypes.STRING(30),
        allowNull: true,
        set(value) {
            this.setDataValue("eps", value ? value.trim().toUpperCase() : null);
        }
    },

    /** Caracterización adicional */
    victimas: {
        type: DataTypes.ENUM("DPZ", "DGA", "HDZ", "OTR", "NA"),
        allowNull: false,
        comment: "DPZ: Desplazado, DGA: Desmovilizado de Grupo Armado, HDZ: Hijo de Desmovilizado de Grupo Armado, OTR: Otro, NA: No aplica"
    },

    discapacidad: {
        type: DataTypes.ENUM("FISICA", "AUDITIVA", "VISUAL", "SORDOCEGUERA", "INTELECTUAL", "PSICOSOCIAL", "MULTIPLE", "OTRA", "NINGUNA"),
        allowNull: false
    },

    capacidades: {
        type: DataTypes.ENUM("SD", "CTC", "CTT", "CTS", "NA"),
        allowNull: false,
        comment: "SD: Superdotado, CTC: Con Talento Científico, CTT: Con Talento Tecnológico, CTS: Con Talento Subjetivo, NA: No Aplica"
    },

    etnia: {
        type: DataTypes.ENUM("INDIGENA", "AFROCOLOMBIANO", "RAIZAL", "ROM_GITANO", "NO_APLICA"),
        allowNull: false,
        comment: "Indigena, Afrocolombiano (Incluye Afrodescendientes, Negros, Mulatos, Palenqueros De San Basilio), Raizal, ROM o Gitano"
    }

}, {
    tableName: "estudiantes",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",

    indexes: [
        {
            unique: true,
            fields: ["documento"],
            name: "idx_documento_estudiante_unico"
        },
        { fields: ["primerApellido", "primerNombre"], name: "idx_primerApellido_nombre" },
        { fields: ["sexo"], name: "idx_sexo" },
        { fields: ["barrio"], name: "idx_barrio" },
        { fields: ["estrato"], name: "idx_estrato" },
        { fields: ["sisben"], name: "idx_sisben" },
        { fields: ["victimas"], name: "idx_victimas" },
        { fields: ["discapacidad"], name: "idx_discapacidad" }
    ]
});