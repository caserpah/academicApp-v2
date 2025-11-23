import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Estudiante
 * ------------------
 * Representa a los estudiantes de la institución educativa.
 * No depende de la vigencia (es registro permanente).
 */

export const Estudiante = sequelize.define("estudiante", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    tipoDocumento: {
        type: DataTypes.ENUM("RC", "TI", "CC", "CE", "PA", "NIP", "NUIP", "NES"),
        allowNull: false
    },
    documento: {
        type: DataTypes.STRING(12),
        allowNull: false
    },
    primerNombre: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    segundoNombre: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    primerApellido: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    segundoApellido: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    fechaNacimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },genero: {
        type: DataTypes.STRING(20),
        allowNull: false
    },rh: {
        type: DataTypes.STRING(4),
        allowNull: true
    },
    direccion: {
        type: DataTypes.STRING(80),
        allowNull: true
    },
    barrio: {
        type: DataTypes.STRING(60),
        allowNull: true
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
        allowNull: true
    },
    victimas: {
        type: DataTypes.ENUM("DZ", "DG", "HD", "OT","NA"),
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
    // Opciones adicionales del modelo
    tableName: 'estudiantes', // Nombre de la tabla en la base de datos
    timestamps: true, // Habilita createdAt y updatedAt automáticamente
    createdAt: 'fechaCreacion', // Renombra el campo createdAt
    updatedAt: 'fechaActualizacion', // Renombra el campo updatedAt
    indexes: [
        {
            unique: true,
            fields: ["tipoDocumento", "documento"],
            name: "idx_tipoDocumento_documento",
        },
        { fields: ["primerApellido", "primerNombre"], name: "idx_primerApellido_nombre" },
        { fields: ["genero"], name: "idx_genero" },
        { fields: ["barrio"], name: "idx_barrio" },
        { fields: ["estrato"], name: "idx_estrato" },
        { fields: ["sisben"], name: "idx_sisben" },
        { fields: ["victimas"], name: "idx_victimas" },
        { fields: ["discapacidad"], name: "idx_discapacidad" },
    ],
});