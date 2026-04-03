import { Op, Sequelize } from "sequelize";
import { Estudiante } from "../models/estudiante.js";
import { Matricula } from "../models/matricula.js";
import { Grupo } from "../models/grupo.js";
import { Sede } from "../models/sede.js";
import { Grado } from "../models/grado.js";
import { Acudiente } from "../models/acudiente.js";
import { Usuario } from "../models/usuario.js";

export const estudianteRepository = {

    /**
     * Listado de estudiantes con:
     * - Búsqueda general (search)
     * - Filtros por campos
     * - Paginación
     * - Ordenamiento
     * - Include opcional de matrículas por vigencia
     */
    async findAll({
        page = 1,
        limit = 20,
        orderBy = "primerApellido",
        order = "ASC",
        busqueda,
        search,
        sexo,
        barrio,
        estrato,
        discapacidad,
        etnia,
        victimas,
        subsidiado,
        sisben,
        includeMatriculas,
        vigenciaId
    }) {

        // Configuración de Paginación (Segura)
        const safePage = Number(page) || 1;
        const safeLimit = Number(limit) || 10;
        const offset = (safePage - 1) * safeLimit;

        // Construcción del WHERE
        const where = {};

        // Si llega 'busqueda' la usa, si no, usa 'search'
        const terminoBusqueda = busqueda || search;

        // Búsqueda general (Nombre o Documento)
        if (terminoBusqueda && terminoBusqueda.trim() !== "") {
            const term = `%${terminoBusqueda.trim()}%`;

            where[Op.or] = [
                { documento: { [Op.like]: term } },
                { primerNombre: { [Op.like]: term } },
                { primerApellido: { [Op.like]: term } },

                //Búsqueda por Nombre Completo Concatenado
                Sequelize.where(
                    Sequelize.fn('CONCAT',
                        Sequelize.col('primerNombre'), ' ',
                        Sequelize.fn('IFNULL', Sequelize.col('segundoNombre'), ''), ' ',
                        Sequelize.col('primerApellido'), ' ',
                        Sequelize.fn('IFNULL', Sequelize.col('segundoApellido'), '')
                    ),
                    { [Op.like]: term }
                )
            ];

        }

        // Filtros específicos (Solo se agregan si tienen valor)
        if (sexo) where.sexo = sexo;
        if (barrio) where.barrio = barrio;
        if (estrato) where.estrato = Number(estrato);
        if (discapacidad) where.discapacidad = discapacidad;
        if (etnia) where.etnia = etnia;
        if (victimas) where.victimas = victimas;
        if (sisben) where.sisben = sisben;

        if (typeof subsidiado !== "undefined") {
            // Manejo robusto de booleano que llega como string
            if (typeof subsidiado === "string") {
                where.subsidiado = subsidiado === "true";
            } else {
                where.subsidiado = !!subsidiado;
            }
        }

        // Includes (Relaciones)
        const include = [];

        if (includeMatriculas && vigenciaId) {
            include.push({
                model: Matricula,
                as: "matriculas",
                where: { vigenciaId },
                required: false, // LEFT JOIN: Trae al estudiante aunque no tenga matrícula
                include: [
                    {
                        model: Grupo,
                        as: "grupo",
                        attributes: ["id", "nombre", "jornada"],
                        include: [{
                            model: Grado,
                            as: "grado",
                            attributes: ["id", "nombre", "codigo"]
                        }]
                    },
                    {
                        model: Sede,
                        as: "sede",
                        attributes: ["id", "codigo", "nombre"]
                    }
                ]
            });
        }

        // Ordenamiento
        let orderClause;
        if (orderBy.includes(".")) {
            // Soporte para ordenar por relaciones (ej: 'matricula.folio')
            const parts = orderBy.split(".");
            orderClause = [[...parts, order]];
        } else {
            // Ordenamiento normal
            orderClause = [[orderBy, order]];
        }

        // Ejecución de la Consulta
        const { rows, count } = await Estudiante.findAndCountAll({
            where,
            limit: safeLimit,
            offset,
            order: orderClause,
            include,
            distinct: true // Importante para contar bien cuando hay includes
        });

        // Retorno formateado
        return {
            items: rows,
            pagination: {
                total: count,
                page: safePage,
                limit: safeLimit,
                totalPages: Math.ceil(count / safeLimit)
            }
        };
    },

    /**
     * Buscar un estudiante por Documento.
     * Incluye matrículas de una vigencia si se especifica y acudientes con su identidad unificada.
     */
    async findByDocumento(documento, { includeMatriculas = false, vigenciaId = null } = {}) {
        const include = [
            {
                model: Acudiente,
                as: "acudientes",
                attributes: ["id", "tipoDocumento", "direccion"], // Solo campos que existen en Acudientes
                through: {
                    attributes: ["afinidad"]
                },
                include: [
                    {
                        model: Usuario,
                        as: "identidad", // El salto hacia la tabla central
                        attributes: ["id", "documento", "nombre", "apellidos", "telefono", "email"]
                    }
                ]
            }
        ];

        if (includeMatriculas && vigenciaId) {
            include.push({
                model: Matricula,
                as: "matriculas",
                where: { vigenciaId },
                required: false,
                include: [
                    {
                        model: Grupo,
                        as: "grupo",
                        attributes: ["id", "nombre", "jornada"],
                        include: [{
                            model: Grado,
                            as: "grado",
                            attributes: ["id", "nombre", "codigo"]
                        }]
                    },
                    {
                        model: Sede,
                        as: "sede",
                        attributes: ["id", "codigo", "nombre"]
                    }
                ]
            });
        }

        return Estudiante.findOne({
            where: { documento },
            include
        });
    },

    /**
     * Buscar un estudiante por ID.
     * Incluye siempre los acudientes con su identidad unificada.
     */
    async findById(id, { includeMatriculas = false, vigenciaId = null } = {}) {

        const include = [
            {
                model: Acudiente,
                as: "acudientes",
                attributes: ["id", "nombres", "apellidos", "tipoDocumento", "documento", "direccion", "telefono", "email"],
                through: {
                    attributes: ["afinidad", "id"]
                }
            }
        ];

        if (includeMatriculas && vigenciaId) {
            include.push({
                model: Matricula,
                as: "matriculas",
                where: { vigenciaId },
                required: false,
                include: [
                    {
                        model: Grupo,
                        as: "grupo",
                        attributes: ["id", "nombre", "jornada"],
                        include: [
                            {
                                model: Grado,
                                as: "grado",
                                attributes: ["id", "nombre", "codigo"]
                            }
                        ]
                    },
                    {
                        model: Sede,
                        as: "sede",
                        attributes: ["id", "codigo", "nombre"]
                    }
                ]
            });
        }

        return Estudiante.findByPk(id, { include });
    },

    create(data) {
        return Estudiante.create(data);
    },

    async updateById(id, data) {
        const registro = await Estudiante.findByPk(id);

        if (!registro) return null;

        await registro.update(data);

        return await this.findById(id);
    },

    async deleteById(id) {
        const registro = await Estudiante.findByPk(id);
        if (!registro) return false;

        await registro.destroy();
        return true;
    }
};