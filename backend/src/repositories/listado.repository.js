import { Op } from "sequelize";
import { Sede } from "../models/sede.js";
import { Grado } from "../models/grado.js";
import { Grupo } from "../models/grupo.js";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Area } from "../models/area.js";
import { Asignatura } from "../models/asignatura.js";
import { Docente } from "../models/docente.js";
import { Usuario } from "../models/usuario.js";
import { Colegio } from "../models/colegio.js";
import { Vigencia } from "../models/vigencia.js";

export const listadoRepository = {

    // ==========================================================
    // CONSULTA PARA EL FRONTEND (Selectores en Cascada)
    // ==========================================================
    async getCatalogoFiltros(vigenciaId) {
        return Sede.findAll({
            attributes: ['id', 'nombre'],
            include: [{
                model: Grupo,
                as: 'grupos',
                where: { vigenciaId },
                required: false,
                attributes: ['id', 'nombre'],
                include: [{
                    model: Grado,
                    as: 'grado',
                    attributes: ['id', 'nombre', 'orden']
                }]
            }],
            order: [
                ['id', 'ASC'], // Orden principal por Sede
                [{ model: Grupo, as: 'grupos' }, { model: Grado, as: 'grado' }, 'orden', 'ASC'],
                [{ model: Grupo, as: 'grupos' }, 'nombre', 'ASC']
            ]
        });
    },

    // ==========================================================
    // LISTADO MASIVO DE ESTUDIANTES (Optimizado)
    // ==========================================================
    async findEstudiantesOptimizados(vigenciaId, sedesIds) {
        return Matricula.findAll({
            where: {
                vigenciaId,
                sedeId: { [Op.in]: sedesIds },
                estado: { [Op.notIn]: ['ANULADO', 'RETIRADO'] } // Excluimos inactivos
            },
            attributes: ['id', 'estado'],
            include: [
                {
                    model: Estudiante,
                    as: 'estudiante',
                    attributes: ['tipoDocumento', 'documento', 'primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido', 'fechaNacimiento', 'sexo']
                },
                {
                    model: Grupo,
                    as: 'grupo',
                    attributes: ['id', 'nombre', 'jornada'],
                    include: [
                        { model: Grado, as: 'grado', attributes: ['id', 'nombre', 'orden'] },
                        {
                            model: Docente, as: 'director', attributes: ['id'],
                            include: [{ model: Usuario, as: 'identidad', attributes: ['nombre', 'apellidos'] }]
                        }
                    ]
                },
                {
                    model: Sede,
                    as: 'sede',
                    attributes: ['id', 'nombre']
                }
            ],
            order: [
                [{ model: Sede, as: 'sede' }, 'id', 'ASC'],
                [{ model: Grupo, as: 'grupo' }, { model: Grado, as: 'grado' }, 'orden', 'ASC'],
                [{ model: Grupo, as: 'grupo' }, 'nombre', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'primerNombre', 'ASC']
            ]
        });
    },

    // ==========================================================
    // LISTADO DE DIRECTORES DE GRUPO
    // ==========================================================
    async findDirectoresGrupo(vigenciaId, sedeId = null) {
        const whereClause = { vigenciaId };
        if (sedeId && sedeId !== 'TODAS') whereClause.sedeId = sedeId;

        return Grupo.findAll({
            where: whereClause,
            attributes: ['id', 'nombre', 'jornada'],
            include: [
                { model: Grado, as: 'grado', attributes: ['nombre', 'orden'] },
                { model: Sede, as: 'sede', attributes: ['nombre', 'id'] },
                {
                    model: Docente,
                    as: 'director',
                    attributes: ['id'], // El docente no tiene el nombre en su tabla
                    include: [{
                        model: Usuario,
                        as: 'identidad', // Vamos a la tabla Usuario por los datos personales
                        attributes: ['documento', 'nombre', 'apellidos']
                    }]
                }
            ],
            order: [
                [{ model: Sede, as: 'sede' }, 'id', 'ASC'],
                [{ model: Grado, as: 'grado' }, 'orden', 'ASC'],
                ['nombre', 'ASC']
            ]
        });
    },

    // ==========================================================
    // LISTADO DE DOCENTES
    // ==========================================================
    async findDocentesListado(sedeId = null) {
        const whereClause = { activo: true };
        if (sedeId && sedeId !== 'TODAS') whereClause.sedeId = sedeId;

        return Docente.findAll({
            where: whereClause,
            attributes: ['id'],
            include: [
                { model: Sede, as: 'sede', attributes: ['id', 'nombre'] },
                {
                    model: Usuario,
                    as: 'identidad',
                    attributes: ['documento', 'nombre', 'apellidos']
                }
            ],
            order: [
                [{ model: Sede, as: 'sede' }, 'id', 'ASC'],
                [{ model: Usuario, as: 'identidad' }, 'apellidos', 'ASC'],
                [{ model: Usuario, as: 'identidad' }, 'nombre', 'ASC']
            ]
        });
    },

    // ==========================================================
    // LISTADO DE ÁREAS Y ASIGNATURAS
    // ==========================================================
    async findAreasYAsignaturas(vigenciaId) {
        return Area.findAll({
            where: {
                vigenciaId,
                nombre: { [Op.notIn]: ['COMPORTAMIENTO', 'DISCIPLINA'] }
            },
            attributes: ['codigo', 'nombre'],
            include: [{
                model: Asignatura,
                as: 'asignaturas',
                where: {
                    vigenciaId,
                    nombre: { [Op.notIn]: ['COMPORTAMIENTO', 'DISCIPLINA'] }
                },
                required: false,
                attributes: ['codigo', 'nombre', 'porcentual']
            }],
            order: [
                ['nombre', 'ASC'],
                [{ model: Asignatura, as: 'asignaturas' }, 'nombre', 'ASC']
            ]
        });
    },

    // ==========================================================
    // DATOS INSTITUCIONALES (Para Encabezados)
    // ==========================================================
    async getDatosInstitucionales() {
        const colegio = await Colegio.findOne({ attributes: ['nombre'] });
        return colegio ? colegio.nombre : 'INSTITUCIÓN EDUCATIVA';
    }
};