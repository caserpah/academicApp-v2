import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

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

    documento: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
    },

    nombre: {
        type: DataTypes.STRING(60),
        allowNull: false
    },

    apellidos: {
        type: DataTypes.STRING(80),
        allowNull: false
    },

    fechaNacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: "Debe ingresar una fecha válida (YYYY-MM-DD)." },
            isBefore: {
                args: [new Date().toISOString().split("T")[0]],
                msg: "La fecha de nacimiento no puede ser futura.",
            },
        },
    },

    email: {
        type: DataTypes.STRING(80),
        allowNull: true
    },

    telefono: {
        type: DataTypes.STRING(12),
        allowNull: true
    },

    nivelEducativo: {
        type: DataTypes.ENUM("BP", "NS", "TP", "OP", "PP", "PS", "OT"),
        allowNull: false,
        validate: {
            isIn: {
                args: [["BP", "NS", "TP", "OP", "PP", "PS", "OT"]],
                msg: "Nivel educativo inválido.",
            },
        },
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
        allowNull: true,
        validate: {
            isDate: { msg: "Debe ingresar una fecha válida (YYYY-MM-DD)." },
            isBefore: {
                args: [new Date().toISOString().split("T")[0]],
                msg: "La fecha de nombramiento no puede ser futura.",
            },
        },
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
    },

    fechaIngreso: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        validate: {
            isDate: { msg: "Debe ingresar una fecha válida (YYYY-MM-DD)." }
        }
    },

    fechaRetiro: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        validate: {
            isDate: { msg: "Debe ingresar una fecha válida (YYYY-MM-DD)." },
            isAfterDateIngreso(value) {
                if (value && this.fechaIngreso && value < this.fechaIngreso) {
                    throw new Error("La fecha de retiro no puede ser menor que la fecha de ingreso.");
                }
            }
        }
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

    areaId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: "areas",
            key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
    },
}, {
    tableName: "docentes",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        { unique: true, fields: ["documento"], name: "idx_documento_docente" },
        { fields: ["nivelEducativo"], name: "idx_nivelEducativo" },
        { fields: ["nivelEnsenanza"], name: "idx_nivelEnsenanza" },
        { fields: ["vinculacion"], name: "idx_vinculacion" },
        { fields: ["activo"], name: "idx_activo_docente" },
        { fields: ["areaId"], name: "idx_areaId_docente" },
    ],
});