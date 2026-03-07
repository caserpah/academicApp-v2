import { Op } from "sequelize";
import { Calificacion } from "../models/calificacion.js";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Asignatura } from "../models/asignatura.js";

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
    async findCalificacionesPorEstudiantes(estudiantesIds, asignaturaId, periodos, vigenciaId) {

        // Si 'periodos' no es un array (ej: viene un 3 desde la grilla), lo envolvemos en un array [3]
        const periodosArray = Array.isArray(periodos) ? periodos : [periodos];

        return Calificacion.findAll({
            where: {
                estudianteId: { [Op.in]: estudiantesIds },
                asignaturaId,
                periodo: { [Op.in]: periodosArray },
                vigenciaId
            },
            attributes: [
                'id',
                'periodo',
                'estudianteId',
                'notaAcademica', 'notaAcumulativa', 'notaLaboral', 'notaSocial', 'notaDefinitiva',
                'fallas', 'recomendacionUno', 'recomendacionDos',
                'observacion_cambio', 'url_evidencia_cambio', 'fecha_edicion'
            ],
            raw: true
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
    },

    /**
     * Obtiene la Carga Académica del docente incluyendo los grupos y sus estudiantes ACTIVOS.
     * Define el "DEBER SER" (a quiénes debería haber calificado).
     */
    async findCargasConEstudiantes(docenteId, vigenciaId) {
        return Carga.findAll({
            where: { docenteId, vigenciaId },
            include: [
                {
                    model: Asignatura,
                    as: 'asignatura',
                    attributes: ['id', 'nombre']
                },
                {
                    model: Grupo,
                    as: 'grupo',
                    attributes: ['id', 'nombre'],
                    include: [
                        {
                            model: Grado,
                            as: 'grado',
                            attributes: ['nombre']
                        },
                        {
                            model: Matricula,
                            as: 'matriculas', // Relación confirmada
                            where: {
                                vigenciaId,
                                // Solo estudiantes ACTIVOS. No pedimos notas a retirados.
                                estado: { [Op.notIn]: ['RETIRADO', 'DESERTADO', 'PREMATRICULADO', 'CANCELADO', 'GRADUADO'] }
                            },
                            required: false, // Left Join (trae el grupo aunque no tenga alumnos aún)
                            include: [{
                                model: Estudiante,
                                as: 'estudiante',
                                attributes: ['id', 'documento', 'primerApellido', 'segundoApellido', 'primerNombre', 'segundoNombre']
                            }]
                        }
                    ]
                }
            ]
        });
    },

    /**
     * Trae SOLO las llaves (IDs) de las calificaciones que YA existen.
     * Consulta ultra-ligera para hacer el cruce en memoria.
     */
    async findLlavesCalificacionesDocente(docenteId, vigenciaId, periodos) {
        return Calificacion.findAll({
            where: {
                docenteId,
                vigenciaId,
                periodo: { [Op.in]: periodos }
            },
            attributes: ['estudianteId', 'asignaturaId', 'periodo'],
            raw: true // Retorna JSON plano sin overhead de Sequelize
        });
    },

    /**
     * Trae TODAS las notas de un grupo de estudiantes para los periodos permitidos,
     * excluyendo la asignatura 'COMPORTAMIENTO'. (Uso exclusivo para Cierre de Año)
     */
    async findCalificacionesParaConsolidado(estudiantesIds, vigenciaId, periodosPermitidos) {
        return Calificacion.findAll({
            where: {
                estudianteId: { [Op.in]: estudiantesIds },
                vigenciaId: vigenciaId,
                periodo: { [Op.in]: periodosPermitidos }
            },
            include: [
                {
                    model: Asignatura,
                    as: 'asignatura',
                    where: {
                        nombre: { [Op.ne]: 'COMPORTAMIENTO' } // Ignorar Comportamiento
                    },
                    attributes: ['id', 'nombre']
                }
            ],
            raw: true,
            nest: true
        });
    }
};