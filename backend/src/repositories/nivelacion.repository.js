import { Op } from "sequelize";
import { Nivelacion } from "../models/nivelacion.js";
import { Matricula } from "../models/matricula.js";
import { Asignatura } from "../models/asignatura.js";
import { Estudiante } from "../models/estudiante.js";

export const nivelacionRepository = {
    /**
     * CREACIÓN MASIVA (Cierre de Periodos)
     * Inserta los promedios originales de todos los estudiantes de una sola vez.
     * @param {Array} registros - Arreglo de objetos a insertar.
     */
    async crearMasivo(registros, { transaction } = {}) {
        return await Nivelacion.bulkCreate(registros, {
            transaction,
            validate: true,
            // updateOnDuplicate es súper útil por si se vuelve a correr el proceso de cierre
            // y se necesita actualizar el promedio original sin duplicar registros.
            updateOnDuplicate: ["notaDefinitivaOriginal", "estadoOriginal", "fechaActualizacion"]
        });
    },

    /**
     * BUSCAR REGISTRO EXACTO
     * Útil cuando el profesor va a subir la nota de nivelación y el archivo.
     */
    async findByMatriculaYAsignatura(matriculaId, asignaturaId, { transaction } = {}) {
        return await Nivelacion.findOne({
            where: { matriculaId, asignaturaId },
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

    /**
     * LISTAR REPROBADOS (Vista del Profesor)
     * Trae SOLO a los estudiantes que perdieron una materia en un grupo específico,
     * listos para que el profesor les ingrese la nivelación.
     */
    async findReprobadosPorGrupoYAsignatura(grupoId, asignaturaId) {
        return await Nivelacion.findAll({
            where: {
                asignaturaId: asignaturaId,
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
                    model: Asignatura,
                    as: "asignatura",
                    attributes: ["id", "nombre", "areaId"]
                }
            ]
        });
    }
};