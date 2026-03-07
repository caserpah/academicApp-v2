import { DataTypes } from "sequelize";
import { sequelize } from "../database/db.connect.js";

/**
 * Modelo: Calificación
 * Registra las notas y juicios por estudiante, asignatura, período y vigencia.
 */
export const Calificacion = sequelize.define("calificacion", {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    },
    periodo: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    // --- INSUMOS ---
    notaAcademica: { type: DataTypes.FLOAT, allowNull: true },
    promedioAcademica: { type: DataTypes.FLOAT, allowNull: true },
    juicioAcademica: { type: DataTypes.TEXT, allowNull: true },

    notaAcumulativa: { type: DataTypes.FLOAT, allowNull: true },
    promedioAcumulativa: { type: DataTypes.FLOAT, allowNull: true },
    juicioAcumulativa: { type: DataTypes.TEXT, allowNull: true },

    notaLaboral: { type: DataTypes.FLOAT, allowNull: true },
    promedioLaboral: { type: DataTypes.FLOAT, allowNull: true },
    juicioLaboral: { type: DataTypes.TEXT, allowNull: true },

    notaSocial: { type: DataTypes.FLOAT, allowNull: true },
    promedioSocial: { type: DataTypes.FLOAT, allowNull: true },
    juicioSocial: { type: DataTypes.TEXT, allowNull: true },

    // --- DEFINITIVA ---
    notaDefinitiva: { type: DataTypes.FLOAT, allowNull: true },

    // --- RECOMENDACIONES (Texto Histórico) ---
    recomendacionUno: { type: DataTypes.TEXT, allowNull: true },
    recomendacionDos: { type: DataTypes.TEXT, allowNull: true },

    fallas: {
        type: DataTypes.INTEGER,
        allowNull: true
    },

    // --- CAMPOS PARA AUDITORÍA DE CAMBIOS (Ventana de Tiempo) ---
    docenteId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Docente que realizó el último registro/modificación.",
        references: { model: "docentes", key: "id" }
    },
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'usuarioId',
        references: { model: "usuarios", key: "id" }
    },
    observacion_cambio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Justificación obligatoria si se edita fuera de fecha."
    },
    url_evidencia_cambio: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Link al documento de soporte (PDF/Img) para cambios extemporáneos."
    },
    fecha_edicion: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Fecha real de la última modificación."
    },

    // --- RELACIONES ---
    estudianteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "estudiantes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    asignaturaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "asignaturas", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
    vigenciaId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "vigencias", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
    },
}, {
    tableName: "calificaciones",
    timestamps: true,
    createdAt: "fechaCreacion",
    updatedAt: "fechaActualizacion",
    indexes: [
        { fields: ["periodo"], name: "idx_calificacion_periodo" },
        { fields: ["estudianteId"], name: "idx_calificacion_estudianteId" },
        { fields: ["asignaturaId"], name: "idx_calificacion_asignaturaId" },
        { fields: ["vigenciaId"], name: "idx_calificacion_vigenciaId" },
        {
            unique: true,
            name: "idx_unique_calificacion_periodo_estudiante_asignatura_vigencia",
            fields: ["periodo", "estudianteId", "asignaturaId", "vigenciaId"],
        },
        { fields: ["notaDefinitiva"], name: "idx_calificacion_notaDefinitiva" },
    ],
});