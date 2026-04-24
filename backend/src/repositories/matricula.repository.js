import { Op, Sequelize } from "sequelize";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Sede } from "../models/sede.js";
import { Vigencia } from "../models/vigencia.js";
import { Acudiente } from "../models/acudiente.js";

export const matriculaRepository = {
    /**
     * Lista matrículas con paginación y filtros avanzados.
     * Incluye relaciones: Estudiante, Grupo->Grado, Sede.
     */
    async findAll({
        page = 1,
        limit = 20,
        vigenciaId,
        sedeId,
        grupoId,
        gradoId,
        estado,
        busqueda,
        orderBy = "estudiante.primerApellido",
        order = "ASC",
        bloqueo_notas, es_nuevo, es_repitente, situacion_ano_anterior
    } = {}) {
        const where = {};
        const include = [];

        // Filtro obligatorio de vigencia (Contexto)
        if (vigenciaId) where.vigenciaId = vigenciaId;

        // Filtros directos
        if (sedeId) where.sedeId = sedeId;
        if (grupoId) where.grupoId = grupoId;
        if (estado) where.estado = estado;

        // LÓGICA DE FILTROS BOOLEANOS/ENUM
        // Nota: Desde el query params todo llega como string ("true", "false", "REPROBO")

        if (bloqueo_notas !== undefined && bloqueo_notas !== null && bloqueo_notas !== "") {
            where.bloqueo_notas = (String(bloqueo_notas) === 'true');
        }

        if (es_nuevo !== undefined && es_nuevo !== null && es_nuevo !== "") {
            where.es_nuevo = (String(es_nuevo) === 'true');
        }
        if (es_repitente !== undefined && es_repitente !== null && es_repitente !== "") {
            where.es_repitente = (String(es_repitente) === 'true');
        }
        if (situacion_ano_anterior !== undefined && situacion_ano_anterior !== null && situacion_ano_anterior !== "") {
            where.situacion_ano_anterior = situacion_ano_anterior;
        }

        // Filtro de búsqueda general (documento, nombre completo, grado)
        if (busqueda) {
            const term = `%${busqueda}%`;
            where[Op.or] = [
                // Por documento exacto o parcial
                { "$estudiante.documento$": { [Op.like]: term } },

                // Combinación: Nombre(s) + Apellido(s)
                Sequelize.where(
                    Sequelize.fn('CONCAT_WS', ' ',
                        Sequelize.col('estudiante.primerNombre'),
                        Sequelize.col('estudiante.segundoNombre'),
                        Sequelize.col('estudiante.primerApellido'),
                        Sequelize.col('estudiante.segundoApellido')
                    ),
                    { [Op.like]: term }
                ),

                // Combinación: Apellido(s) + Nombre(s)
                Sequelize.where(
                    Sequelize.fn('CONCAT_WS', ' ',
                        Sequelize.col('estudiante.primerApellido'),
                        Sequelize.col('estudiante.segundoApellido'),
                        Sequelize.col('estudiante.primerNombre'),
                        Sequelize.col('estudiante.segundoNombre')
                    ),
                    { [Op.like]: term }
                ),

                // Búsqueda por el nombre del Grado (ej. "SEXTO")
                { "$grupo.grado.nombre$": { [Op.like]: term } }
            ];
        }

        // Relación Estudiante (con atributos específicos para optimizar la consulta)
        include.push({
            model: Estudiante,
            as: "estudiante",
            attributes: [
                "id", "tipoDocumento", "documento",
                "primerNombre", "segundoNombre",
                "primerApellido", "segundoApellido", "sexo"
            ],
        });

        // Filtro y relación de Grupo -> Grado
        const whereGrado = {};
        if (gradoId) {
            whereGrado.id = gradoId;
        }

        include.push({
            model: Grupo,
            as: "grupo",
            include: [
                {
                    model: Grado,
                    as: "grado",
                    where: Object.keys(whereGrado).length > 0 ? whereGrado : undefined,
                    attributes: ["id", "nombre", "codigo", "orden", "nivelAcademico"],
                },
            ],
            attributes: ["id", "nombre", "jornada"],
        });

        // Relación Sede
        include.push({
            model: Sede,
            as: "sede",
            attributes: ["id", "nombre", "codigo"],
        });

        // Paginación
        const offset = (Number(page) - 1) * Number(limit);

        let orderClause;

        if (orderBy.includes(".")) {
            // Caso: Ordenar por relación (ej: 'estudiante.primerApellido')
            // Se convierte en: [['estudiante', 'primerApellido', 'ASC']]
            const parts = orderBy.split(".");
            orderClause = [[...parts, order]];
        } else {
            // Caso: Ordenar por campo directo (ej: 'fechaCreacion')
            // Se convierte en: [['fechaCreacion', 'ASC']]
            orderClause = [[orderBy, order]];
        }

        const { rows, count } = await Matricula.findAndCountAll({
            where,
            include,
            offset,
            limit: Number(limit),
            order: orderClause,
        });

        return {
            items: rows,
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit))
        };
    },

    /**
     * Busca una matrícula por ID incluyendo detalles completos.
     */
    async findById(id, { transaction } = {}) {
        return Matricula.findByPk(id, {
            transaction,
            include: [
                { model: Estudiante, as: "estudiante" },
                { model: Grupo, as: "grupo", include: [{ model: Grado, as: "grado" }] },
                { model: Sede, as: "sede" },
            ],
        });
    },

    /**
     * Busca si un estudiante ya tiene matrícula en una vigencia.
     */
    async findByEstudianteYVigencia(estudianteId, vigenciaId, { transaction } = {}) {
        return Matricula.findOne({
            where: { estudianteId, vigenciaId },
            transaction
        });
    },

    /**
     * Crear una matrícula.
     */
    async create(payload, { transaction } = {}) {
        return Matricula.create(payload, { transaction });
    },

    /**
     * Actualizar una matrícula.
     */
    async update(id, payload, { transaction } = {}) {
        const [updatedRows] = await Matricula.update(payload, {
            where: { id },
            transaction
        });
        return updatedRows > 0 ? await this.findById(id, { transaction }) : null;
    },

    /**
     * Eliminar una matrícula.
     */
    async delete(id, { transaction } = {}) {
        return Matricula.destroy({
            where: { id },
            transaction
        });
    },

    /**
     * CREACIÓN MASIVA (Optimizado para Promoción y Prematrícula)
     * Recibe un array de objetos de matrícula y los inserta en una sola transacción.
     */
    async createBulk(matriculas, { transaction } = {}) {
        try {
            return await Matricula.bulkCreate(matriculas, {
                transaction,
                validate: true, // Ejecuta las validaciones del modelo
                ignoreDuplicates: false // Lanza error si hay duplicados
            });
        } catch (error) {
            // Si falla, el error suele ser genérico, así que lo propagamos
            // para que el servicio decida si hace rollback de todo el bloque.
            throw error;
        }
    },

    /**
     * Conteo rápido de matriculados en un grupo.
     * Vital para validar cupos antes de una inserción masiva.
     */
    async countByGrupo(grupoId, vigenciaId, { transaction } = {}) {
        return Matricula.count({
            where: {
                grupoId,
                vigenciaId,
                // Cuenta solo las activas o prematriculadas para el cupo
                estado: {
                    [Op.in]: ["ACTIVA", "PREMATRICULADO"]
                }
            },
            transaction
        });
    },

    /**
     * Buscar matrículas de un grupo específico (Origen para la promoción).
     * Devuelve solo lo necesario para procesar la promoción.
     */
    async findByGrupoForPromocion(grupoId, vigenciaId) {
        return Matricula.findAll({
            where: { grupoId, vigenciaId, estado: "ACTIVA" },
            include: [
                {
                    model: Estudiante,
                    as: "estudiante",
                    attributes: ["id", "primerNombre", "primerApellido"]
                }
            ],
            raw: true,
            nest: true
        });
    },

    /**
     * Busca una matrícula con TODO el árbol de relaciones para imprimir el Acta en PDF.
     */
    async findByIdCompleto(id) {
        return Matricula.findByPk(id, {
            include: [
                { model: Sede, as: "sede" },
                { model: Vigencia, as: "vigencia" },
                { model: Grupo, as: "grupo", include: [{ model: Grado, as: "grado" }] },
                {
                    model: Estudiante,
                    as: "estudiante",
                    include: [{ model: Acudiente, as: "acudientes" }] // Ajusta el alias si en tu BD es distinto
                }
            ]
        });
    },

    /**
     * Busca todas las matrículas de un grupo para imprimir actas por lote (Masivo).
     */
    async findByGrupoCompleto(grupoId, vigenciaId) {
        return Matricula.findAll({
            where: { grupoId, vigenciaId, estado: ['ACTIVA', 'PREMATRICULADO'] },
            include: [
                { model: Sede, as: "sede" },
                { model: Vigencia, as: "vigencia" },
                { model: Grupo, as: "grupo", include: [{ model: Grado, as: "grado" }] },
                {
                    model: Estudiante,
                    as: "estudiante",
                    include: [{ model: Acudiente, as: "acudientes" }]
                }
            ],
            order: [
                [{ model: Estudiante, as: "estudiante" }, 'primerApellido', 'ASC']
            ]
        });
    }
};