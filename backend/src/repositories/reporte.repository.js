import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Sede } from "../models/sede.js";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Calificacion } from "../models/calificacion.js";
import { Carga } from "../models/carga.js";
import { Docente } from "../models/docente.js";
import { Usuario } from "../models/usuario.js";
import { Asignatura } from "../models/asignatura.js";
import { Area } from "../models/area.js";
import { Colegio } from "../models/colegio.js";

export const reporteRepository = {

    async findColegio() {
        return Colegio.findOne();
    },

    async findGrupoConDetalles(grupoId, vigenciaId) {
        return Grupo.findOne({
            where: { id: grupoId, vigenciaId },
            include: [
                { model: Grado, as: 'grado' },
                { model: Sede, as: 'sede' },
                {
                    model: Docente,
                    as: 'director',
                    include: [{ model: Usuario, as: 'identidad', attributes: ['nombre', 'apellidos'] }]
                }
            ]
        });
    },

    async findMatriculasActivas(grupoId, vigenciaId) {
        return Matricula.findAll({
            where: { grupoId, vigenciaId, estado: 'ACTIVA' },
            include: [{
                model: Estudiante,
                as: 'estudiante',
                attributes: ['id', 'documento', 'primerApellido', 'segundoApellido', 'primerNombre', 'segundoNombre']
            }],
            order: [
                [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'primerNombre', 'ASC']
            ]
        });
    },

    // Extrae la información de la Asignatura junto con su Área
    async findAsignaturaConArea(asignaturaId) {
        return Asignatura.findByPk(asignaturaId, {
            include: [{ model: Area, as: 'area', attributes: ['nombre', 'abreviatura'] }]
        });
    },

    // Extrae quién dicta esta materia en este grupo
    async findDocenteDeCarga(grupoId, asignaturaId, vigenciaId) {
        const carga = await Carga.findOne({
            where: { grupoId, asignaturaId, vigenciaId },
            include: [{
                model: Docente, as: 'docente',
                include: [{ model: Usuario, as: 'identidad', attributes: ['nombre', 'apellidos'] }]
            }]
        });
        return carga ? carga.docente : null;
    },

    // Extrae TODAS las notas (periodos 1 al 4) de un grupo de estudiantes
    async findCalificacionesHistoricas(estudiantesIds, asignaturaId, vigenciaId) {
        const whereClause = {
            estudianteId: estudiantesIds,
            vigenciaId: vigenciaId,
            periodo: [1, 2, 3, 4]
        };

        if (asignaturaId) {
            whereClause.asignaturaId = asignaturaId;
        }

        return Calificacion.findAll({
            where: whereClause,
            attributes: ['estudianteId', 'asignaturaId', 'periodo', 'notaDefinitiva'],
            raw: true
        });
    },

    // Extrae el docente a partir del usuario logueado (para mostrar su nombre en la cabecera de la sábana)
    async findDocentePorUsuarioId(usuarioId) {
        return Docente.findOne({ where: { usuarioId } });
    },

    // Extrae la carga académica de un grupo, incluyendo los porcentajes de cada asignatura y a qué Área pertenecen
    async findCargasConAreaPorGrupo(grupoId, vigenciaId) {
        return Carga.findAll({
            where: { grupoId, vigenciaId },
            include: [{
                model: Asignatura,
                as: 'asignatura',
                attributes: ['id', 'nombre', 'porcentual'],
                include: [{ model: Area, as: 'area', attributes: ['id', 'nombre', 'abreviatura'] }]
            }]
        });
    },
};