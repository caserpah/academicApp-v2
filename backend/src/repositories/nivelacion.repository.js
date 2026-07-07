import { Op } from "sequelize";
import { Vigencia } from "../models/vigencia.js";
import { Nivelacion } from "../models/nivelacion.js";
import { Matricula } from "../models/matricula.js";
import { Area } from "../models/area.js";
import { Estudiante } from "../models/estudiante.js";
import { CalificacionArea } from "../models/calificacionArea.js";
import { Carga } from "../models/carga.js"
import { Asignatura } from "../models/asignatura.js"
import { Grado } from "../models/grado.js"
import { Grupo } from "../models/grupo.js"
import { DesempenoRango } from "../models/desempeno_rango.js"
import { Desempeno } from "../models/desempeno.js"
import { Docente } from "../models/docente.js"
import { Usuario } from "../models/usuario.js"

export const nivelacionRepository = {
    /**
     * CREACIÓN MASIVA (Cierre de Periodos)
     * Inserta los promedios originales de todos los estudiantes de una sola vez.
     */
    async crearMasivo(registros, { transaction } = {}) {
        return await Nivelacion.bulkCreate(registros, {
            transaction,
            validate: true,
            updateOnDuplicate: ["notaDefinitivaOriginal", "detalleAsignaturas", "estadoOriginal", "fechaActualizacion"]
            // updateOnDuplicate es útil por si se vuelve a correr el proceso de cierre
            // y se necesita actualizar el promedio original sin duplicar registros.
        });
    },

    /**
     * BUSCAR REGISTRO EXACTO
     * Útil cuando el profesor va a subir la nota de nivelación y el acta de nivelación.
     */
    async findByMatriculaYArea(matriculaId, areaId, { transaction } = {}) {
        return await Nivelacion.findOne({
            where: { matriculaId, areaId },
            transaction
        });
    },

    /**
     * ACTUALIZAR (Guardar Nivelación)
     * Guarda la nota de recuperación, el cálculo del 3.0, el estado final y la URL de la evidencia.
     */
    async actualizar(id, datosParaGuardar, { transaction } = {}) {
        const [updatedRows] = await Nivelacion.update(datosParaGuardar, {
            where: { id },
            transaction
        });

        // Devolvemos el registro actualizado para que el controller pueda responder con él
        return updatedRows > 0 ? await Nivelacion.findByPk(id, { transaction }) : null;
    },


    async findReprobadosPorGrupo(grupoId) {
        return await Nivelacion.findAll({
            include: [
                {
                    model: Matricula,
                    as: "matricula",
                    where: { grupoId: grupoId, estado: "ACTIVA" },
                    attributes: ["id", "folio"],
                    include: [
                        {
                            model: Estudiante,
                            as: "estudiante",
                            attributes: [
                                "id", "documento", "primerNombre", "segundoNombre",
                                "primerApellido", "segundoApellido"
                            ]
                        }
                    ]
                },
                {
                    model: Area,
                    as: "area",
                    attributes: ["id", "nombre"]
                }
            ],
            // Ordenamos alfabéticamente por el apellido del estudiante
            order: [
                [{ model: Matricula, as: "matricula" }, { model: Estudiante, as: "estudiante" }, 'primerApellido', 'ASC']
            ]
        });
    },

    /**
     * LISTAR REPROBADOS (Vista del Profesor)
     * Trae los reprobados por ÁREA. El frontend usará el JSON 'detalleAsignaturas'
     * para mostrarle al profesor qué materias causaron la pérdida.
     */
    async findReprobadosPorGrupoYArea(grupoId, areaId) {
        return await Nivelacion.findAll({
            where: {
                areaId: areaId,
                estadoOriginal: "REPROBADO"
            },
            include: [
                {
                    model: Matricula,
                    as: "matricula",
                    where: { grupoId: grupoId, estado: "ACTIVA" },
                    attributes: ["id", "folio"],
                    include: [
                        {
                            model: Estudiante,
                            as: "estudiante",
                            attributes: [
                                "id", "documento", "primerNombre", "segundoNombre",
                                "primerApellido", "segundoApellido"
                            ]
                        }
                    ]
                }
            ],
            // Ordenamos alfabéticamente por el apellido del estudiante
            order: [
                [{ model: Matricula, as: "matricula" }, { model: Estudiante, as: "estudiante" }, 'primerApellido', 'ASC']
            ]
        });
    },

    /**
     * LISTAR TODO EL AÑO DE UN ESTUDIANTE (Para el Motor de Promoción)
     * Trae todas las definitivas y nivelaciones de una matrícula para
     * contar cuántas perdió al final del año.
     */
    async findAllByMatricula(matriculaId) {
        return await Nivelacion.findAll({
            where: { matriculaId },
            include: [
                {
                    model: Area,
                    as: "area",
                    attributes: ["id", "nombre"]
                }
            ]
        });
    },

    /**
     * VERIFICAR CONSOLIDADOS (Para UX de Promoción Masiva)
     * Revisa si un grupo ya tiene el cierre de año generado.
     */
    async verificarConsolidadoGenerado(grupoId, vigenciaId) {
        return await CalificacionArea.findOne({
            include: [{
                model: Matricula,
                as: 'matricula',
                where: { grupoId, vigenciaId }
            }]
        });
    },

    /**
     * TRAER ÁREAS REPROBADAS DEL GRUPO (Para Auditoría Administrativa)
     * Extrae todas las calificaciones consolidadas que tengan una nota inferior a 3.0
     * mapeando la información de matrícula, estudiante y área académica.
     */
    async findAreasPerdidasPorGrupo(grupoId, vigenciaId) {
        return await CalificacionArea.findAll({
            where: {
                notaDefinitiva: { [Op.lt]: 3.0 }, // Filtro para notas menores a 3.0
                vigenciaId
            },
            include: [
                {
                    model: Matricula,
                    as: "matricula",
                    where: { grupoId },
                    attributes: ["id", "folio"],
                    include: [
                        {
                            model: Estudiante,
                            as: "estudiante",
                            attributes: [
                                "id", "documento", "primerNombre", "segundoNombre",
                                "primerApellido", "segundoApellido"
                            ]
                        }
                    ]
                },
                {
                    model: Area,
                    as: "area",
                    attributes: ["id", "nombre"]
                }
            ],
            order: [
                [{ model: Matricula, as: "matricula" }, { model: Estudiante, as: "estudiante" }, 'primerApellido', 'ASC']
            ]
        });
    },

    async findDocenteOficialPorArea(matriculaId, areaId) {
        // Primero, necesitamos saber en qué grupo está el estudiante
        const matricula = await Matricula.findByPk(matriculaId, { attributes: ['grupoId'] });
        if (!matricula) return null;

        // Segundo, buscamos la carga académica de ese grupo y de las asignaturas de esta área
        const cargaOficial = await Carga.findOne({
            where: { grupoId: matricula.grupoId },
            include: [{
                model: Asignatura,
                as: 'asignatura',
                where: { areaId: areaId },
                attributes: ['id']
            }]
        });
        // Si por alguna razón no hay carga asignada, queda en null, pero no rompe el sistema
        return cargaOficial ? cargaOficial.docenteId : null;
    },

    async findAreasPermitidasPorDocente(grupoId, docenteId) {
        const cargas = await Carga.findAll({
            where: { grupoId, docenteId },
            include: [{ model: Asignatura, as: 'asignatura', attributes: ['areaId'] }]
        });
        return cargas.map(c => c.asignatura.areaId);
    },

    async findGradoById(gradoId) {
        return await Grado.findByPk(gradoId);
    },

    async findRangosDesempeno(vigenciaId) {
        return await DesempenoRango.findAll({
            where: { vigenciaId },
            include: [{ model: Desempeno, as: "desempeno" }]
        });
    },

    async findCargasConDetalles(grupoId, vigenciaId) {
        return await Carga.findAll({
            where: { grupoId, vigenciaId },
            include: [
                { model: Asignatura, as: 'asignatura', attributes: ['id', 'nombre', 'porcentual', 'areaId'] },
                { model: Docente, as: 'docente', include: [{ model: Usuario, as: 'identidad', attributes: ["documento", "nombre", "apellidos"] }] }
            ]
        });
    },

    async guardarConsolidadosMasivo(registros, transaction) {
        return await CalificacionArea.bulkCreate(registros, {
            transaction,
            updateOnDuplicate: ["notaDefinitiva", "estadoFinal", "juicioAcademico", "fechaActualizacion"]
        });
    },

    async findMatriculaConNivelAcademico(estudianteId, vigenciaId, transaction) {
        return await Matricula.findOne({
            where: { estudianteId, vigenciaId },
            include: [{ model: Grupo, as: "grupo", include: [{ model: Grado, as: "grado" }] }],
            transaction
        });
    },

    /**
     * Busca nivelaciones en estado PENDIENTE para un grupo de matrículas
     */
    async findNivelacionesPendientes(matriculasIds, vigenciaId, transaction) {
        return await Nivelacion.findAll({
            where: {
                matriculaId: { [Op.in]: matriculasIds },
                vigenciaId: vigenciaId,
                estadoFinal: 'PENDIENTE'
            },
            attributes: ['id', 'matriculaId', 'areaId'],
            raw: true,
            transaction
        });
    },

    /**
     * Elimina físicamente registros de nivelación que ya no son válidos
     */
    async eliminarMasivoPorIds(ids, transaction) {
        return await Nivelacion.destroy({
            where: {
                id: { [Op.in]: ids }
            },
            transaction
        });
    },

    /**
     * Obtiene todas las nivelaciones registradas para un grupo de matrículas en la vigencia actual
     */
    async findNivelacionesPorMatriculas(matriculasIds, vigenciaId, transaction) {
        return await Nivelacion.findAll({
            where: { matriculaId: { [Op.in]: matriculasIds }, vigenciaId },
            transaction
        });
    },

    /**
     * OBTENER ESTUDIANTES PARA ACTA DE NIVELACIÓN POR ÁREA
     * Trae los estudiantes que tienen una nivelación registrada para un área, grupo y vigencia específicos,
     * aplicando el blindaje reglamentario: EXCLUYE de forma estricta a los estudiantes que acumulan 3 o más
     * áreas reprobadas en total (quienes pierden el año directamente y no tienen derecho a nivelar).
     */
    async findEstudiantesParaActaNivelacion(grupoId, areaId, vigenciaId) {
        return await Nivelacion.findAll({
            where: {
                areaId,
                vigenciaId,
                // Blindaje estricto: la matrícula no puede pertenecer al grupo de estudiantes con >= 3 áreas reprobadas
                matriculaId: {
                    [Op.notIn]: Nivelacion.sequelize.literal(`(
                        SELECT ca.matriculaId
                        FROM calificaciones_areas ca
                        INNER JOIN areas a ON ca.areaId = a.id
                        WHERE ca.vigenciaId = ${Nivelacion.sequelize.escape(vigenciaId)}
                        AND ca.estadoFinal = 'REPROBADO'
                        AND UPPER(a.nombre) NOT IN ('COMPORTAMIENTO', 'DISCIPLINA')
                        GROUP BY ca.matriculaId
                        HAVING COUNT(ca.id) >= 3
                    )`)
                }
            },
            include: [
                {
                    model: Matricula,
                    as: "matricula",
                    where: { grupoId, estado: "ACTIVA" },
                    attributes: ["id", "folio"],
                    include: [
                        {
                            model: Estudiante,
                            as: "estudiante",
                            attributes: [
                                "id", "documento", "primerNombre", "segundoNombre",
                                "primerApellido", "segundoApellido"
                            ]
                        }
                    ]
                },
                {
                    model: Area,
                    as: "area",
                    attributes: ["id", "nombre"]
                }
            ],
            // Ordenamiento alfabético estándar institucional
            order: [
                [{ model: Matricula, as: "matricula" }, { model: Estudiante, as: "estudiante" }, 'primerApellido', 'ASC']
            ]
        });
    },

    async marcarCierreGrupo(grupoId, transaction) {
        await Grupo.update(
            { cierreGenerado: true },
            { where: { id: grupoId }, transaction }
        );
    },

    /**
     * Verifica si un grupo específico ya realizó el cierre de año
     */
    async verificarCierreGrupo(grupoId) {
        const grupo = await Grupo.findByPk(grupoId, {
            attributes: ['cierreGenerado']
        });

        // Retornamos true si está marcado, de lo contrario false
        return grupo ? grupo.cierreGenerado : false;
    }
};