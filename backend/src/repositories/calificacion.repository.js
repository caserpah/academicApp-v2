import { Op } from "sequelize";
import { Area } from "../models/area.js";
import { Calificacion } from "../models/calificacion.js";
import { CalificacionArea } from "../models/calificacionArea.js"
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Asignatura } from "../models/asignatura.js";
import { VentanaCalificacion } from "../models/ventana_calificacion.js";
import { Carga } from "../models/carga.js";
import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Docente } from "../models/docente.js";
import { Usuario } from "../models/usuario.js";

export const calificacionRepository = {

    /**
     * Busca las matrículas de un grupo para armar la estructura base de la grilla.
     */
    async findMatriculasPorGrupo(grupoId, vigenciaId) {
        return Matricula.findAll({
            where: {
                grupoId,
                vigenciaId,
                estado: { [Op.notIn]: ['RETIRADO', 'DESERTADO', 'ANULADO'] } // Solo estudiantes activos (no retirados ni desertados)
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
                // Ordenar por Apellidos y Nombres
                [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'primerNombre', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoNombre', 'ASC']
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
                    model: Docente,
                    as: "docente",
                    include: [{
                        model: Usuario,
                        as: 'identidad',
                        attributes: ["documento", "nombre", "apellidos"]
                    }]
                },
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
                            as: 'matriculas',
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
     * Trae TODAS las notas de un grupo de estudiantes para los periodos permitidos. (Uso exclusivo para Cierre de Año)
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
                    attributes: ['id', 'nombre', 'areaId', 'porcentual']
                }
            ],
            raw: true,
            nest: true
        });
    },

    /**
     * Busca la configuración de la ventana de calificaciones para un periodo específico
     */
    async findVentana(periodo, vigenciaId) {
        return VentanaCalificacion.findOne({
            where: { periodo, vigenciaId }
        });
    },

    /**
     * INSERCIÓN/ACTUALIZACIÓN MASIVA DE CALIFICACIONES
     * Rellena las notas faltantes detectadas en el cierre de año.
     */
    async guardarMasivo(registros, { transaction } = {}) {
        return await Calificacion.bulkCreate(registros, {
            transaction,
            validate: true,
            // Si el registro ya existe, actualizamos TODOS los campos calculados
            updateOnDuplicate: [
                "notaAcademica", "promedioAcademica", "juicioAcademica",
                "notaAcumulativa", "promedioAcumulativa", "juicioAcumulativa",
                "notaLaboral", "promedioLaboral", "juicioLaboral",
                "notaSocial", "promedioSocial", "juicioSocial",
                "notaDefinitiva",
                "observacion_cambio",
                "fecha_edicion",
                "fechaActualizacion"
            ]
        });
    },

    async findCalificacionesParaMerge(vigenciaId, estudiantesIds, asignaturasIds, transaction) {
        return await Calificacion.findAll({
            where: {
                vigenciaId,
                estudianteId: { [Op.in]: estudiantesIds },
                asignaturaId: { [Op.in]: asignaturasIds }
            },
            raw: true,
            transaction
        });
    },

    /**
     * Obtiene los consolidados finales de un grupo de matrículas para un periodo específico (Cierre)
     */
    async findConsolidadosPorMatriculas(matriculasIds, periodoCierre) {
        return await CalificacionArea.findAll({
            where: {
                matriculaId: { [Op.in]: matriculasIds },
                periodo: periodoCierre
            },
            include: [{ model: Area, as: 'area', attributes: ['id', 'nombre'] }],
            raw: true,
            nest: true
        });
    }
};