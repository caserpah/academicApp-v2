import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: CodigoBoletin
 * Representa un token seguro y de uso público para descargar boletines en PDF
 */
export const CodigoBoletin = sequelize.define("codigoBoletin", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },

    /** Código Autogenerado (El Token) */
    codigo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: "Código alfanumérico corto impreso en el boletín físico (Ej: A7X9-P2M4)."
    },

    /** PERIODO ACADÉMICO */
    periodo: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: "Periodo académico del boletín (Ej: 1, 2, 3, 4, 5)."
    },

    /** ESTADO DE SEGURIDAD */
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "Si es false, bloquea la descarga del PDF al público."
    },

    /** AUDITORÍA DE DESCARGAS */
    descargas: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Contador de veces que el acudiente ha descargado el PDF."
    },

    /** CADUCIDAD (OPCIONAL) */
    fechaExpiracion: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Fecha en que el código dejará de ser válido automáticamente."
    },

    /** AUDITORÍA */
    usuarioGeneracion: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "usuarios", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        comment: "ID del administrativo que generó el lote de códigos."
    },

    /** REFERENCIAS PRINCIPALES */
    matriculaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "matriculas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE" // Si se elimina la matrícula, sus códigos mueren con ella
    },

    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
    }

}, {
    tableName: "codigos_boletines",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",

    indexes: [
        { fields: ["codigo"], name: "idx_codigo_boletin_unico" },
        { fields: ["matriculaId"], name: "idx_codigo_boletin_matricula" },
        { fields: ["vigenciaId"], name: "idx_codigo_boletin_vigencia" },

        /** EVITAR DUPLICADOS POR PERIODO */
        {
            unique: true,
            name: "idx_unique_matricula_periodo",
            fields: ["matriculaId", "periodo"],
            comment: "Una matrícula solo debería tener un único código activo por periodo."
        }
    ]
});