import { Op } from "sequelize";
import { Calificacion } from "../models/calificacion.js";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";

export const calificacionRepository = {

    /**
     * Busca las matrículas de un grupo para armar la estructura base de la grilla.
     */
    async findMatriculasPorGrupo(grupoId, vigenciaId) {
        return Matricula.findAll({
            where: {
                grupoId,
                vigenciaId,
                estado: { [Op.notIn]: ['RETIRADO', 'DESERTADO'] } // Solo estudiantes activos (no retirados ni desertados)
            },
            include: [
                {
                    model: Estudiante,
                    as: "estudiante",
                    attributes: ["id", "primerNombre", "segundoNombre", "primerApellido", "segundoApellido", "documento"]
                }
            ],
            order: [
                ['bloqueo_notas', 'ASC'],
                // Ordenar por Apellido y Nombre
                [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'primerNombre', 'ASC']
            ]
        });
    },

    /**
     * Busca las calificaciones existentes para un listado de estudiantes en una materia/periodo.
     */
    async findCalificacionesPorEstudiantes(estudiantesIds, asignaturaId, periodo, vigenciaId) {
        return Calificacion.findAll({
            where: {
                estudianteId: { [Op.in]: estudiantesIds },
                asignaturaId,
                periodo,
                vigenciaId
            }
        });
    },

    /**
     * Busca una calificación específica (para saber si existe antes de guardar).
     */
    async findOne(estudianteId, asignaturaId, periodo, vigenciaId, transaction = null) {
        return Calificacion.findOne({
            where: { estudianteId, asignaturaId, periodo, vigenciaId },
            transaction
        });
    },

    /**
     * Crea un nuevo registro.
     */
    async create(data, transaction = null) {
        return Calificacion.create(data, { transaction });
    },

    /**
     * Actualiza un registro existente.
     */
    async update(instancia, data, transaction = null) {
        return instancia.update(data, { transaction });
    }
};