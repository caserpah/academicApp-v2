import { Op } from "sequelize";
import { Juicio } from "../models/juicio.js";
import { Asignatura } from "../models/asignatura.js";
import { Grado } from "../models/grado.js";
import { Dimension } from "../models/dimension.js";
import { Desempeno } from "../models/desempeno.js";

export const juicioRepository = {

    /**
     * Listar juicios con filtros, paginación y ordenamiento.
     */
    async findAll({
        vigenciaId,
        gradoId,
        dimensionId,
        desempenoId,
        asignaturaId,
        periodo,
        activo,
        search,
        page,
        limit,
        orderBy,
        order
    }) {
        // Filtro base: siempre por vigencia
        const where = { vigenciaId };

        // Filtro explícito de estado
        if (activo !== undefined && activo !== null && activo !== "") {
            where.activo = (String(activo) === "true");
        }

        // Filtros opcionales específicos
        if (dimensionId) where.dimensionId = dimensionId;
        if (desempenoId) where.desempenoId = desempenoId;
        if (periodo) where.periodo = periodo;

        // ---------------------------------------------------------
        //  LÓGICA DE JERARQUÍA (Globales vs Específicos)
        // ---------------------------------------------------------

        // Solo aplicamos esta lógica compleja si estamos filtrando por Grado o Asignatura
        if (gradoId || asignaturaId) {

            const condicionesOr = [];

            // A. Coincidencia Exacta (Prioridad Máxima)
            const matchExacto = {};
            if (gradoId) matchExacto.gradoId = gradoId;
            if (asignaturaId) matchExacto.asignaturaId = asignaturaId;
            condicionesOr.push(matchExacto);

            // B. Transversales Globales (Grado NULL, Asignatura NULL)
            condicionesOr.push({
                gradoId: null,
                asignaturaId: null
            });

            // C. Globales de Asignatura (Grado NULL, Asignatura ESPECÍFICA)
            if (asignaturaId) {
                condicionesOr.push({
                    gradoId: null,
                    asignaturaId: asignaturaId
                });
            }

            // Inyectamos estas condiciones DENTRO del bloque if
            where[Op.and] = [
                ...(where[Op.and] || []),
                { [Op.or]: condicionesOr }
            ];
        }

        // ---------------------------------------------------------
        //  BÚSQUEDA GLOBAL (Search)
        // ---------------------------------------------------------
        if (search) {
            const term = search.trim();
            const termUpper = term.toUpperCase();
            const likeTerm = `%${term}%`;

            const orConditions = [
                { texto: { [Op.like]: likeTerm } },
                { '$grado.nombre$': { [Op.like]: likeTerm } },
                { '$asignatura.nombre$': { [Op.like]: likeTerm } },
                { '$dimension.nombre$': { [Op.like]: likeTerm } },
                { '$desempeno.nombre$': { [Op.like]: likeTerm } }
            ];

            // Detectar estado en el texto
            if ("INACTIVO".includes(termUpper) && termUpper.length >= 3) {
                orConditions.push({ activo: false });
            } else if ("ACTIVO".includes(termUpper) && termUpper.length >= 3) {
                orConditions.push({ activo: true });
            }

            where[Op.and] = [
                ...(where[Op.and] || []),
                { [Op.or]: orConditions }
            ];
        }

        // Paginación
        const offset = (page - 1) * limit;

        const { rows, count } = await Juicio.findAndCountAll({
            where,
            limit: Number(limit),
            offset: Number(offset),
            order: [[orderBy || 'id', order || 'DESC']],
            subQuery: false, // Necesario para includes con filtros
            include: [
                { model: Asignatura, as: "asignatura", attributes: ["id", "codigo", "nombre", "abreviatura"] },
                { model: Grado, as: "grado", attributes: ["id", "nombre", "codigo", "modalidad"] },
                { model: Dimension, as: "dimension", attributes: ["id", "nombre", "codigo"] },
                { model: Desempeno, as: "desempeno", attributes: ["id", "nombre", "codigo", "orden"] },
            ]
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / limit)
            },
        };
    },

    findById(id, vigenciaId) {
        return Juicio.findOne({
            where: { id, vigenciaId },
            include: [
                { model: Asignatura, as: "asignatura", attributes: ["id", "codigo", "nombre", "abreviatura"] },
                { model: Grado, as: "grado", attributes: ["id", "nombre", "codigo", "modalidad"] },
                { model: Dimension, as: "dimension", attributes: ["id", "nombre", "codigo"] },
                { model: Desempeno, as: "desempeno", attributes: ["id", "nombre", "codigo", "orden"] },
            ],
        });
    },

    create(data) {
        return Juicio.create(data);
    },

    async updateById(id, data) {
        const registro = await Juicio.findByPk(id);
        if (!registro) return null;

        await registro.update(data);
        return registro;
    },

    async deleteById(id, vigenciaId) {
        const registro = await Juicio.findOne({ where: { id, vigenciaId } });
        if (!registro) return false;

        await registro.destroy();
        return true;
    },
};