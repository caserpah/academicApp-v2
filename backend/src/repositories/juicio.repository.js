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
        incluyeInactivos,
        search,
        page,
        limit,
        orderBy,
        order
    }) {
        // Filtro base: siempre por vigencia
        const where = { vigenciaId };

        // Filtros opcionales específicos
        if (!incluyeInactivos) where.activo = true;
        if (gradoId) where.gradoId = gradoId;
        if (dimensionId) where.dimensionId = dimensionId;
        if (desempenoId) where.desempenoId = desempenoId;
        if (asignaturaId) where.asignaturaId = asignaturaId;
        if (periodo) where.periodo = periodo;

        // BÚSQUEDA GLOBAL MULTI-CAMPO
        // Busca coincidencias en Texto OR Grado OR Asignatura OR Dimensión
        if (search) {
            const searchTerm = `%${search}%`;

            // Usamos Op.and para combinar con los filtros anteriores,
            // y Op.or para buscar en cualquiera de las columnas deseadas.
            where[Op.and] = [
                ...(where[Op.and] || []), // Mantiene otros AND si existieran
                {
                    [Op.or]: [
                        { texto: { [Op.like]: searchTerm } },                  // Buscar en Texto del Juicio
                        { '$grado.nombre$': { [Op.like]: searchTerm } },       // Buscar en Nombre del Grado
                        { '$asignatura.nombre$': { [Op.like]: searchTerm } },  // Buscar en Nombre de Asignatura
                        { '$dimension.nombre$': { [Op.like]: searchTerm } }    // Buscar en Nombre de Dimensión
                    ]
                }
            ];
        }

        const offset = (page - 1) * limit;

        const { rows, count } = await Juicio.findAndCountAll({
            where,
            limit,
            offset,
            order: [[orderBy || 'id', order || 'DESC']],
            // Es necesario subQuery: false cuando filtramos por columnas de tablas incluidas ($tabla.col$)
            // para que la paginación (limit/offset) funcione correctamente sobre el resultado final.
            subQuery: false,
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
                page,
                limit,
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