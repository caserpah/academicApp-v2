import { Op } from "sequelize";
import { Colegio } from "../models/colegio.js";
import { Sede } from "../models/sede.js";
import { DesempenoRango } from "../models/desempeno_rango.js";
import { Desempeno } from "../models/desempeno.js";
import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Estudiante } from "../models/estudiante.js";
import { Matricula } from "../models/matricula.js";
import { Calificacion } from "../models/calificacion.js";
import { Asignatura } from "../models/asignatura.js";
import { Area } from "../models/area.js";
import { Juicio } from "../models/juicio.js";
import { Carga } from "../models/carga.js";
import { Docente } from "../models/docente.js";
import { Usuario } from "../models/usuario.js";

export const boletinRepository = {

    /**
     * 1. Extrae la info del Grupo, Grado, Director y el Colegio.
     */
    async findInfoGrupo(grupoId) {
        const infoGrupo = await Grupo.findByPk(grupoId, {
            include: [
                {
                    model: Grado,
                    as: "grado",
                    attributes: ["id", "nombre", "nivelAcademico"]
                },
                {
                    model: Docente,
                    as: "director",
                    include: [{
                        model: Usuario,
                        as: 'identidad',
                        attributes: ["documento", "nombre", "apellidos"] // Solo traes lo que necesitas
                    }]
                },
                {
                    model: Sede,
                    as: "sede",
                    attributes: ["id", "nombre"]
                }
            ]
        });

        // Traemos el primer registro del colegio
        const infoColegio = await Colegio.findOne();
        return { grupo: infoGrupo, colegio: infoColegio };
    },

    /**
     * Extrae la tabla de rangos de desempeño para el encabezado
     */
    async findRangosDesempeno(vigenciaId) {
        return DesempenoRango.findAll({
            where: { vigenciaId, activo: true },
            include: [
                { model: Desempeno, as: "desempeno", attributes: ["nombre"] }
            ],
            order: [['minNota', 'DESC']] // Para que SUPERIOR salga de primero
        });
    },

    /**
     * 2. Extrae las Matrículas y Estudiantes ACTIVOS del Grupo (a quiénes se les va a generar boletín).
      * Solo estudiantes ACTIVOS. No pedimos notas a retirados.
      * Ordenamos por bloqueo_notas (para priorizar los que no tienen notas) y luego alfabéticamente.
     */
    async findMatriculasPorGrupo(grupoId, vigenciaId) {
        return Matricula.findAll({
            where: {
                grupoId,
                vigenciaId,
                estado: { [Op.notIn]: ['RETIRADO', 'DESERTADO', 'ANULADO'] }
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
                [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'primerNombre', 'ASC']
            ]
        });
    },

    /**
     * 3. Extrae las Cargas Académicas del Grupo (Para intensidad horaria y docentes por materia)
     */
    async findCargasPorGrupo(grupoId, vigenciaId) {
        return Carga.findAll({
            where: { grupoId, vigenciaId },
            include: [
                {
                    model: Docente,
                    as: "docente",
                    include: [{
                        model: Usuario,
                        as: 'identidad',
                        attributes: ["nombre", "apellidos"] // Solo traes lo que necesitas
                    }]
                },
                {
                    model: Asignatura,
                    as: "asignatura",
                    attributes: ["id", "nombre", "areaId"]
                }
            ]
        });
    },

    /**
     * 4. Calificaciones Históricas con Asignaturas y Áreas
     */
    async findCalificacionesHistoricasLote(idsEstudiantes, vigenciaId) {
        return Calificacion.findAll({
            where: {
                estudianteId: { [Op.in]: idsEstudiantes },
                vigenciaId
            },
            include: [
                {
                    model: Asignatura,
                    as: "asignatura",
                    attributes: ["id", "nombre", "porcentual"],
                    include: [
                        {
                            model: Area,
                            as: "area",
                            attributes: ["id", "nombre"]
                        }
                    ]
                }
            ],
            order: [
                // Ordenamos alfabéticamente por Área y luego por Asignatura
                [{ model: Asignatura, as: "asignatura" }, { model: Area, as: "area" }, "nombre", "ASC"],
                [{ model: Asignatura, as: "asignatura" }, "nombre", "ASC"],
                ["estudianteId", "ASC"],
                ["periodo", "ASC"]
            ]
        });
    },

    /**
     * 5. Extrae Juicios parametrizados (Para Periodo Final o Comportamiento)
     */
    async findJuiciosLote(gradoId, vigenciaId) {
        return Juicio.findAll({
            where: {
                gradoId,
                vigenciaId,
                activo: true
            },
            attributes: ["id", "texto", "dimensionId", "desempenoId", "asignaturaId", "periodo"]
        });
    }

};