import { Op } from "sequelize";
import { CodigoBoletin } from "../models/codigoBoletin.js";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Vigencia } from "../models/vigencia.js";

export const codigoBoletinRepository = {

    /**
     * ==========================================
     * ACCESO PÚBLICO (EL PUENTE DEL ACUDIENTE)
     * ==========================================
     * Busca un código exacto y trae toda la información anidada necesaria
     * para que el generador de PDF sepa de quién son las notas.
     */
    async findByCodigoPublico(codigo, { transaction } = {}) {
        return CodigoBoletin.findOne({
            where: {
                codigo: codigo.toUpperCase(), // Aseguramos formato
                activo: true // Seguridad: Solo códigos activos
            },
            include: [
                {
                    model: Vigencia,
                    as: "vigencia",
                    attributes: ["id", "anio"]
                },
                {
                    model: Matricula,
                    as: "matricula",
                    include: [
                        {
                            model: Estudiante,
                            as: "estudiante",
                            attributes: ["id", "documento", "primerNombre", "segundoNombre", "primerApellido", "segundoApellido"]
                        },
                        {
                            model: Grupo,
                            as: "grupo",
                            attributes: ["id", "nombre", "jornada"],
                            include: [{ model: Grado, as: "grado", attributes: ["id", "nombre"] }]
                        }
                    ]
                }
            ],
            transaction
        });
    },

    /**
     * ==========================================
     * AUDITORÍA Y CONTROL
     * ==========================================
     * Incrementa el contador de descargas de manera atómica
     * para evitar condiciones de carrera si dos papás abren el link al tiempo.
     */
    async registrarDescarga(id, { transaction } = {}) {
        return CodigoBoletin.increment('descargas', {
            by: 1,
            where: { id },
            transaction
        });
    },

    /**
     * Cambia el estado del código (Activo / Inactivo)
     * Botón de pánico administrativo.
     */
    async cambiarEstado(id, activo, { transaction } = {}) {
        const [updatedRows] = await CodigoBoletin.update(
            { activo },
            { where: { id }, transaction }
        );
        return updatedRows > 0;
    },

    /**
     * ==========================================
     * GESTIÓN ADMINISTRATIVA (SECRETARÍA)
     * ==========================================
     * Lista los códigos de un salón específico para un periodo específico.
     * Útil para ver quién ya descargó el boletín y quién falta.
     */
    async findByGrupoYPeriodo({ grupoId, vigenciaId, periodo, busqueda }, { transaction } = {}) {
        const whereCodigo = { periodo, vigenciaId };

        // Filtro de búsqueda por código o estudiante (opcional)
        const whereEstudiante = {};
        if (busqueda) {
            whereEstudiante[Op.or] = [
                { primerNombre: { [Op.like]: `%${busqueda}%` } },
                { primerApellido: { [Op.like]: `%${busqueda}%` } },
                { documento: { [Op.like]: `%${busqueda}%` } }
            ];
            // También permitimos buscar por el código alfanumérico en sí
            whereCodigo.codigo = { [Op.like]: `%${busqueda}%` };
        }

        return CodigoBoletin.findAll({
            where: busqueda ? { [Op.or]: [whereCodigo, { '$matricula.estudiante.documento$': { [Op.like]: `%${busqueda}%` } }] } : whereCodigo,
            include: [
                {
                    model: Matricula,
                    as: "matricula",
                    where: { grupoId }, // Filtramos por el salón
                    attributes: ["id", "estado"],
                    include: [
                        {
                            model: Estudiante,
                            as: "estudiante",
                            attributes: ["id", "documento", "primerNombre", "primerApellido"]
                        }
                    ]
                }
            ],
            order: [
                // Ordenamos alfabéticamente por el apellido del estudiante usando la relación
                [{ model: Matricula, as: 'matricula' }, { model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC']
            ],
            transaction
        });
    },

    /**
     * Busca si ya existen códigos generados para un grupo y periodo.
     * Vital para no duplicar códigos si la secretaria le da click a "Generar" dos veces.
     */
    async existenCodigosParaGrupo(grupoId, vigenciaId, periodo, { transaction } = {}) {
        const count = await CodigoBoletin.count({
            where: { periodo, vigenciaId },
            include: [
                {
                    model: Matricula,
                    as: "matricula",
                    where: { grupoId },
                    required: true // Hace un INNER JOIN
                }
            ],
            transaction
        });
        return count > 0;
    },

    /**
     * ==========================================
     * INSERCIÓN MASIVA
     * ==========================================
     * Inserta decenas o cientos de códigos en una sola operación atómica.
     */
    async createBulk(codigosArray, { transaction } = {}) {
        return CodigoBoletin.bulkCreate(codigosArray, {
            transaction,
            validate: true,
            ignoreDuplicates: true // Si un código por alguna razón estadística se repite o ya existía para ese periodo, lo ignora en lugar de crashear todo el lote.
        });
    },

    /**
     * Busca un código específico por matrícula y periodo
     */
    async obtenerPorMatriculaYPeriodo(matriculaId, periodo, { transaction } = {}) {
        return CodigoBoletin.findOne({
            where: { matriculaId, periodo },
            transaction
        });
    },

    /**
     * Crea un código individual
     */
    async crear(payload, { transaction } = {}) {
        return CodigoBoletin.create(payload, { transaction });
    }
};