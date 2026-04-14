import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Sede } from "../models/sede.js";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Docente } from "../models/docente.js";
import { Colegio } from "../models/colegio.js";
import { Usuario } from "../models/usuario.js";
import { Carga } from "../models/carga.js";
import { Asignatura } from "../models/asignatura.js";

export const planillaRepository = {

    async findColegio() {
        return Colegio.findOne(); // Trae el registro de la institución
    },

    async findGrupoConDetalles(grupoId, vigenciaId) {
        return Grupo.findOne({
            where: { id: grupoId, vigenciaId },
            include: [
                { model: Grado, as: 'grado' },
                { model: Sede, as: 'sede' }
            ]
        });
    },

    async findDocentePorUsuarioId(usuarioId) {
        return Docente.findOne({ where: { usuarioId } });
    },

    async findMatriculasActivasPorGrupo(grupoId, vigenciaId) {
        return Matricula.findAll({
            where: {
                grupoId,
                vigenciaId,
                estado: 'ACTIVA' // Solo estudiantes activos
            },
            include: [{
                model: Estudiante,
                as: 'estudiante',
                attributes: ['documento', 'primerApellido', 'segundoApellido', 'primerNombre', 'segundoNombre']
            }],
            order: [
                [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'primerNombre', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoNombre', 'ASC']
            ]
        });
    },

    // Obtener todos los docentes activos para el selector del administrador
    async findAllDocentesActivos() {
        return Docente.findAll({
            include: [{ model: Usuario, as: 'identidad', attributes: ['nombre', 'apellidos'] }],
            order: [[{ model: Usuario, as: 'identidad' }, 'nombre', 'ASC']]
        });
    },

    // Obtener todas las asignaturas que dicta un docente en una vigencia
    async findCargasPorDocente(docenteId, vigenciaId) {
        return Carga.findAll({
            where: { docenteId, vigenciaId },
            include: [
                {
                    model: Grupo,
                    as: 'grupo',
                    include: [
                        { model: Grado, as: 'grado' },
                        { model: Sede, as: 'sede' }
                    ]
                },
                { model: Asignatura, as: 'asignatura' },
                {
                    model: Docente,
                    as: 'docente',
                    include: [{ model: Usuario, as: 'identidad', attributes: ['nombre', 'apellidos'] }]
                }
            ]
        });
    },

    // Obtener todos los grupos donde el docente es director (Para Comportamiento)
    async findGruposDirigidos(directorId, vigenciaId) {
        return Grupo.findAll({
            where: { directorId, vigenciaId },
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
};