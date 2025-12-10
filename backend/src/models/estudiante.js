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
        allowNull: false,
        validate: {
            isDate: { msg: "La fecha de nacimiento del estudiante debe ser válida." },
            isBefore: {
                args: [new Date().toISOString().split("T")[0]],
                msg: "La fecha de nacimiento del estudiante no puede ser futura."
            }
        }
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
        type: DataTypes.ENUM("DZ", "DG", "HD", "OT", "NA"),
        allowNull: false
    },

    discapacidad: {
        type: DataTypes.ENUM("DA", "DF", "DI", "DM", "NA", "DP", "DS", "DV"),
        allowNull: false
    },

    capacidades: {
        type: DataTypes.ENUM("SD", "TC", "TT", "TS", "NA"),
        allowNull: false
    },

    etnia: {
        type: DataTypes.ENUM("RM", "IG", "NR", "PL", "RZ", "NA"),
        allowNull: false
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