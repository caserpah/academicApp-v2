import { Op } from "sequelize";
import { Estudiante } from "../models/estudiante.js";
import { Matricula } from "../models/matricula.js";
import { Grupo } from "../models/grupo.js";
import { Sede } from "../models/sede.js";
import { Grado } from "../models/grado.js";

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
        page,
        limit,
        orderBy,
        order,
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
        const where = {};

        // Búsqueda general: documento, nombres, apellidos
        if (search && search.trim() !== "") {
            const term = `%${search.trim().toUpperCase()}%`;

            where[Op.or] = [
                { documento: { [Op.like]: `%${search.trim()}%` } },
                { primerNombre: { [Op.like]: term } },
                { segundoNombre: { [Op.like]: term } },
                { primerApellido: { [Op.like]: term } },
                { segundoApellido: { [Op.like]: term } },
            ];
        }

        // Filtros específicos
        if (sexo) where.sexo = sexo;
        if (barrio) where.barrio = barrio.toUpperCase();
        if (estrato) where.estrato = Number(estrato);
        if (discapacidad) where.discapacidad = discapacidad;
        if (etnia) where.etnia = etnia;
        if (victimas) where.victimas = victimas;
        if (sisben) where.sisben = sisben;
        if (typeof subsidiado !== "undefined") {
            // subsidiado puede venir como string "true"/"false"
            if (typeof subsidiado === "string") {
                where.subsidiado = subsidiado === "true";
            } else {
                where.subsidiado = subsidiado;
            }
        }

        const offset = (page - 1) * limit;

        // Includes
        const include = [];

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

        const { rows, count } = await Estudiante.findAndCountAll({
            where,
            limit,
            offset,
            order: [[orderBy, order]],
            include
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        };
    },

    /**
     * Buscar un estudiante por ID.
     * Opcionalmente puede incluir matrículas de una vigencia.
     */
    async findById(id, { includeMatriculas = false, vigenciaId = null } = {}) {

        const include = [];

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
        return registro;
    },

    async deleteById(id) {
        const registro = await Estudiante.findByPk(id);
        if (!registro) return false;

        await registro.destroy();
        return true;
    }
};