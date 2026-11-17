import { Op } from "sequelize";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Carga } from "../models/carga.js";
import { Calificacion } from "../models/calificacion.js";
import { DesempenoRango } from "../models/desempeno_rango.js";
import { Desempeno } from "../models/desempeno.js";
import { Area } from "../models/area.js";
import { Asignatura } from "../models/asignatura.js";
import { Sede } from "../models/sede.js";
import { Vigencia } from "../models/vigencia.js";
import { Colegio } from "../models/colegio.js";
import { CalificacionArea } from "../models/calificacionArea.js";
import { Nivelacion } from "../models/nivelacion.js";

export const certificadoRepository = {
    async findColegio() {
        return Colegio.findOne();
    },

    async findMatriculaConDetalles(matriculaId) {
        return Matricula.findByPk(matriculaId, {
            include: [
                { model: Estudiante, as: 'estudiante' },
                {
                    model: Grupo,
                    as: 'grupo',
                    include: [{ model: Grado, as: 'grado' }]
                },
                { model: Sede, as: 'sede' },
                { model: Vigencia, as: 'vigencia' }
            ]
        });
    },

    /**
     * Búsqueda general optimizada para millones de registros:
     * - Si es un número puro, busca por prefijo en 'documento' para aprovechar el índice B-Tree.
     * - Separa la carga de matrículas ('separate: true') para evitar subconsultas pesadas con LIMIT.
     */
    async buscarEstudiantesGeneral(termino) {
        const palabras = termino.trim().toUpperCase().replace(/\s+/g, ' ').split(' ');
        if (palabras.length === 0 || palabras[0] === '') return [];

        const esSoloDocumento = palabras.length === 1 && /^\d+$/.test(palabras[0]);

        const whereEstudiante = esSoloDocumento
            ? { documento: { [Op.startsWith]: palabras[0] } }
            : {
                [Op.and]: palabras.map(palabra => ({
                    [Op.or]: [
                        { documento: { [Op.substring]: palabra } },
                        { primerNombre: { [Op.substring]: palabra } },
                        { segundoNombre: { [Op.substring]: palabra } },
                        { primerApellido: { [Op.substring]: palabra } },
                        { segundoApellido: { [Op.substring]: palabra } }
                    ]
                }))
            };

        return Estudiante.findAll({
            where: whereEstudiante,
            attributes: ['id', 'documento', 'primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido'],
            include: [
                {
                    model: Matricula,
                    as: 'matriculas',
                    separate: true,
                    attributes: ['id', 'vigenciaId', 'grupoId', 'sedeId', 'estado'],
                    include: [
                        {
                            model: Grupo,
                            as: 'grupo',
                            attributes: ['id', 'nombre', 'jornada'],
                            include: [{ model: Grado, as: 'grado', attributes: ['id', 'nombre'] }]
                        },
                        { model: Sede, as: 'sede', attributes: ['id', 'nombre'] },
                        { model: Vigencia, as: 'vigencia', attributes: ['id', 'anio'] }
                    ],
                    order: [[{ model: Vigencia, as: 'vigencia' }, 'anio', 'DESC']]
                }
            ],
            order: [
                ['primerApellido', 'ASC'],
                ['primerNombre', 'ASC']
            ],
            limit: 20
        });
    },

    // ==========================================================
    // MÉTODOS INDIVIDUALES PARA CERTIFICADO DE ESTUDIOS (NOTAS)
    // ==========================================================

    async findCalificacionesCertificado(estudianteId, vigenciaId, periodo) {
        return Calificacion.findAll({
            where: { estudianteId, vigenciaId, periodo },
            attributes: ['id', 'estudianteId', 'asignaturaId', 'periodo', 'notaDefinitiva', 'juicioAcademica'],
            include: [
                {
                    model: Asignatura,
                    as: 'asignatura',
                    attributes: ['id', 'nombre', 'porcentual', 'areaId'],
                    include: [{ model: Area, as: 'area', attributes: ['id', 'nombre'] }]
                }
            ],
            order: [
                [{ model: Asignatura, as: 'asignatura' }, { model: Area, as: 'area' }, 'nombre', 'ASC'],
                [{ model: Asignatura, as: 'asignatura' }, 'nombre', 'ASC']
            ]
        });
    },

    async findCargasParaCertificado(grupoId, vigenciaId) {
        return Carga.findAll({
            where: { grupoId, vigenciaId },
            attributes: ['id', 'asignaturaId', 'horas'],
            include: [{ model: Asignatura, as: 'asignatura', attributes: ['id', 'areaId', 'porcentual'] }]
        });
    },

    /**
     * Obtiene los rangos de desempeño de una vigencia para saber
     * si una nota numérica equivale a BASICO, ALTO, SUPERIOR, etc.
     */
    async findRangosDesempeno(vigenciaId) {
        return DesempenoRango.findAll({
            where: { vigenciaId, activo: true },
            attributes: ['id', 'minNota', 'maxNota'],
            include: [
                { model: Desempeno, as: 'desempeno', attributes: ['id', 'nombre'] }
            ],
            order: [['minNota', 'ASC']]
        });
    },

    /**
     * Obtiene las calificaciones definitivas por ÁREA para el certificado final.
     */
    async findCalificacionesAreasCertificado(matriculaId, vigenciaId, periodo) {
        return CalificacionArea.findAll({
            where: { matriculaId, vigenciaId, periodo },
            attributes: ['id', 'matriculaId', 'areaId', 'notaDefinitiva', 'estadoFinal'],
            include: [
                { model: Area, as: 'area', attributes: ['id', 'nombre'] }
            ],
            order: [[{ model: Area, as: 'area' }, 'nombre', 'ASC']]
        });
    },

    /**
     * Obtiene las nivelaciones del estudiante en una vigencia.
     */
    async findNivelacionesCertificado(matriculaId, vigenciaId) {
        return Nivelacion.findAll({
            where: { matriculaId, vigenciaId },
            attributes: ['id', 'matriculaId', 'areaId', 'notaDefinitivaOriginal', 'notaFinalLegal', 'estadoFinal'],
            include: [
                { model: Area, as: 'area', attributes: ['id', 'nombre'] }
            ]
        });
    },

    // ==========================================================
    // MÉTODOS EN LOTE (BATCH QUERIES) PARA EMISIÓN MASIVA
    // ==========================================================

    /**
     * Obtiene todas las matrículas de un grupo y vigencia ordenadas alfabéticamente.
     */
    async findMatriculasPorGrupo(grupoId, vigenciaId) {
        return Matricula.findAll({
            where: { grupoId, vigenciaId },
            attributes: ['id', 'folio', 'estado', 'estudianteId', 'grupoId', 'sedeId', 'vigenciaId'],
            include: [
                {
                    model: Estudiante,
                    as: 'estudiante',
                    attributes: [
                        'id',
                        'tipoDocumento',
                        'documento',
                        'lugarExpedicion',
                        'primerNombre',
                        'segundoNombre',
                        'primerApellido',
                        'segundoApellido'
                    ]
                },
                {
                    model: Grupo,
                    as: 'grupo',
                    attributes: ['id', 'nombre', 'jornada'],
                    include: [
                        {
                            model: Grado,
                            as: 'grado',
                            attributes: ['id', 'nombre', 'nivelAcademico']
                        }
                    ]
                },
                { model: Sede, as: 'sede', attributes: ['id', 'nombre'] },
                { model: Vigencia, as: 'vigencia', attributes: ['id', 'anio'] }
            ],
            order: [
                [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'primerNombre', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoNombre', 'ASC']
            ]
        });
    },

    /**
     * Trae en una sola consulta las calificaciones de múltiples estudiantes para uno o varios periodos.
     */
    async findCalificacionesLote(estudianteIds, vigenciaId, periodos) {
        if (!estudianteIds || estudianteIds.length === 0) return [];
        const periodosArray = Array.isArray(periodos) ? periodos : [periodos];

        return Calificacion.findAll({
            where: {
                estudianteId: { [Op.in]: estudianteIds },
                vigenciaId,
                periodo: { [Op.in]: periodosArray }
            },
            attributes: ['id', 'estudianteId', 'asignaturaId', 'periodo', 'notaDefinitiva', 'juicioAcademica'],
            include: [
                {
                    model: Asignatura,
                    as: 'asignatura',
                    attributes: ['id', 'nombre', 'porcentual', 'areaId'],
                    include: [{ model: Area, as: 'area', attributes: ['id', 'nombre'] }]
                }
            ],
            order: [
                [{ model: Asignatura, as: 'asignatura' }, { model: Area, as: 'area' }, 'nombre', 'ASC'],
                [{ model: Asignatura, as: 'asignatura' }, 'nombre', 'ASC']
            ]
        });
    },

    /**
     * Trae en una sola consulta las definitivas de área por matriculaId (usa índice idx_unique_calif_area_matricula_area).
     */
    async findCalificacionesAreasLote(matriculaIds, vigenciaId, periodo) {
        if (!matriculaIds || matriculaIds.length === 0) return [];

        return CalificacionArea.findAll({
            where: {
                matriculaId: { [Op.in]: matriculaIds },
                vigenciaId,
                periodo
            },
            attributes: ['id', 'matriculaId', 'areaId', 'notaDefinitiva', 'estadoFinal'],
            include: [
                { model: Area, as: 'area', attributes: ['id', 'nombre'] }
            ],
            order: [[{ model: Area, as: 'area' }, 'nombre', 'ASC']]
        });
    },

    /**
     * Trae en una sola consulta las nivelaciones por matriculaId (usa índice idx_nivelacion_matricula).
     */
    async findNivelacionesLote(matriculaIds, vigenciaId) {
        if (!matriculaIds || matriculaIds.length === 0) return [];

        return Nivelacion.findAll({
            where: {
                matriculaId: { [Op.in]: matriculaIds },
                vigenciaId
            },
            attributes: ['id', 'matriculaId', 'areaId', 'notaDefinitivaOriginal', 'notaFinalLegal', 'estadoFinal'],
            include: [
                { model: Area, as: 'area', attributes: ['id', 'nombre'] }
            ]
        });
    }
};