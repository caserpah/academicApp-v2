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

    // Método de búsqueda general para estudiantes
    async buscarEstudiantesGeneral(termino) {

        // Limpiamos espacios múltiples y dividimos la cadena por palabras individuales
        const palabras = termino.trim().toUpperCase().replace(/\s+/g, ' ').split(' ');

        // Previene búsquedas vacías si el usuario solo envía espacios
        if (palabras.length === 0 || palabras[0] === '') return [];

        // Construimos una matriz de condiciones dinámicas
        // Para CADA palabra, le decimos a Sequelize que verifique si está en ALGUNO de los campos
        const condiciones = palabras.map(palabra => ({
            [Op.or]: [
                { documento: { [Op.substring]: palabra } },
                { primerNombre: { [Op.substring]: palabra } },
                { segundoNombre: { [Op.substring]: palabra } },
                { primerApellido: { [Op.substring]: palabra } },
                { segundoApellido: { [Op.substring]: palabra } }
            ]
        }));

        return Estudiante.findAll({
            where: {
                // 3. Aplicamos un Op.and global: TODAS las palabras ingresadas deben tener coincidencia
                [Op.and]: condiciones
            },
            include: [
                {
                    model: Matricula,
                    as: 'matriculas',
                    include: [
                        { model: Grupo, as: 'grupo', include: [{ model: Grado, as: 'grado' }] },
                        { model: Sede, as: 'sede' },
                        { model: Vigencia, as: 'vigencia' }
                    ]
                }
            ],
            order: [
                ['primerApellido', 'ASC'],
                ['primerNombre', 'ASC'],
                [{ model: Matricula, as: 'matriculas' }, { model: Vigencia, as: 'vigencia' }, 'anio', 'DESC']
            ],
            limit: 20 // Excelente práctica mantener este límite para escalar a millones de registros
        });
    },

    // ==========================================================
    // MÉTODOS PARA EL CERTIFICADO DE ESTUDIOS (NOTAS)
    // ==========================================================

    /**
     * Obtiene las calificaciones de un estudiante en una vigencia y periodo específico.
     * Incluye la Asignatura y el Área para poder agruparlas y calcular promedios.
     */
    async findCalificacionesEstudiante(estudianteId, vigenciaId, periodo) {
        return Calificacion.findAll({
            where: {
                estudianteId,
                vigenciaId,
                periodo
            },
            include: [
                {
                    model: Asignatura,
                    as: 'asignatura',
                    include: [
                        { model: Area, as: 'area' }
                    ]
                }
            ],
            // Ordenamos alfabéticamente por Área y luego por Asignatura
            order: [
                [{ model: Asignatura, as: 'asignatura' }, { model: Area, as: 'area' }, 'nombre', 'ASC'],
                [{ model: Asignatura, as: 'asignatura' }, 'nombre', 'ASC']
            ]
        });
    },

    async findCalificacionesCertificado(estudianteId, vigenciaId, periodo) {
        return Calificacion.findAll({
            where: { estudianteId, vigenciaId, periodo },
            include: [
                {
                    model: Asignatura,
                    as: 'asignatura',
                    include: [{ model: Area, as: 'area' }]
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
            include: [{ model: Asignatura, as: 'asignatura' }]
        });
    },

    /**
     * Obtiene los rangos de desempeño de una vigencia para saber
     * si una nota numérica equivale a BASICO, ALTO, SUPERIOR, etc.
     */
    async findRangosDesempeno(vigenciaId) {
        return DesempenoRango.findAll({
            where: { vigenciaId, activo: true },
            include: [
                { model: Desempeno, as: 'desempeno' }
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
            include: [
                { model: Area, as: 'area' }
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
            include: [
                { model: Area, as: 'area' }
            ]
        });
    }
};