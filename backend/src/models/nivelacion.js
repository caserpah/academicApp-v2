import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Nivelacion
 * Registra las recuperaciones finales de asignaturas perdidas en el año.
 */
export const Nivelacion = sequelize.define("nivelacion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nota: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "La nueva nota obtenida tras la nivelación."
    },
    fecha: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    url_evidencia: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Link obligatorio al acta o evidencia física."
    },
    observacion: {
        type: DataTypes.TEXT,
        allowNull: true
    },

    matriculaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "matriculas", key: "id" }
    },
    asignaturaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "asignaturas", key: "id" }
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" }
    }
}, {
    tableName: "nivelaciones",
    timestamps: true,
    indexes: [
        {
            unique: true,
            name: "idx_unique_nivelacion_matricula_asignatura",
            fields: ["matriculaId", "asignaturaId"]
        }
    ]
});