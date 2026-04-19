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
import { Op } from "sequelize";

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
        // Limpiamos el término de búsqueda
        const busquedaLimpia = termino.trim().toUpperCase();

        return Estudiante.findAll({
            where: {
                [Op.or]: [
                    { documento: { [Op.substring]: busquedaLimpia } },
                    { primerNombre: { [Op.substring]: busquedaLimpia } },
                    { primerApellido: { [Op.substring]: busquedaLimpia } },
                    { segundoNombre: { [Op.substring]: busquedaLimpia } },
                    { segundoApellido: { [Op.substring]: busquedaLimpia } }
                ]
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
            limit: 20 // Límite de seguridad para no saturar la respuesta si buscan letras muy comunes
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
    }
};