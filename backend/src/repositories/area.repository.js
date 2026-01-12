import { Op } from "sequelize";
import { Area } from "../models/area.js";
import { Vigencia } from "../models/vigencia.js";

/**
 * Repository: Area
 * ----------------
 * Encapsula el acceso a datos para el modelo Area.
 * No conoce de Express ni de la forma en que se obtienen vigencias o usuarios.
 */
export const areaRepository = {
    /**
     * Listado de áreas con paginación, filtros y ordenamiento.
     *
     * @param {object} params
     *  - page: número de página (1 por defecto)
     *  - limit: tamaño de página (20 por defecto)
     *  - vigenciaId: filtrar por vigencia (obligatorio a nivel de servicio)
     *  - search: texto para buscar por código/nombre/abreviatura
     *  - orderBy: campo de ordenamiento (nombre por defecto)
     *  - order: ASC | DESC (ASC por defecto)
     *  - attributes: lista de campos a devolver (opcional)
     *  - includeVigencia: si incluye o no la relación con Vigencia
     */
    async findAll(params = {}) {
        const {
            page = 1,
            limit = 10,
            vigenciaId,
            search,
            orderBy = "nombre",
            order = "ASC",
            attributes,
            includeVigencia = true,
        } = params;

        // Convertimos explícitamente a enteros para evitar el error de sintaxis SQL
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const where = {};

        if (vigenciaId) {
            where.vigenciaId = vigenciaId;
        }

        if (search && search.trim() !== "") {
            const term = `%${search.trim().toUpperCase()}%`;
            where[Op.or] = [
                { codigo: { [Op.like]: term } },
                { nombre: { [Op.like]: term } },
                { abreviatura: { [Op.like]: term } },
            ];
        }

        const validOrderFields = [
            "id",
            "codigo",
            "nombre",
            "abreviatura",
            "promociona",
        ];
        const safeOrderBy = validOrderFields.includes(orderBy) ? orderBy : "nombre";
        const safeOrderDirection = order?.toUpperCase() === "DESC" ? "DESC" : "ASC";

        const include = [];
        if (includeVigencia) {
            include.push({
                model: Vigencia,
                as: "vigencia",
                attributes: ["id", "anio"],
            });
        }

        const { rows, count } = await Area.findAndCountAll({
            where,
            limit: limitNum,
            offset: offset,
            order: [[safeOrderBy, safeOrderDirection]],
            attributes,
            include,
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum),
            }
        };
    },

    /**
     * Buscar un área por su ID.
     * @param {number} id
     * @param {object} options
     *  - attributes: campos a devolver
     *  - includeVigencia: incluir o no la relación con Vigencia
     */
    async findById(id, options = {}) {
        const {
            attributes,
            includeVigencia = true,
        } = options;

        const include = [];

        if (includeVigencia) {
            include.push({
                model: Vigencia,
                as: "vigencia",
                attributes: ["id", "anio"],
            });
        }

        return Area.findByPk(id, {
            attributes,
            include,
        });
    },

    /**
     * Crear un registro de área.
     * (La validación de vigenciaId y datos se hace en el servicio/validador)
     */
    async create(data) {
        return Area.create(data);
    },

    /**
     * Actualizar un área por ID.
     * Devuelve la instancia actualizada o null si no existe.
     */
    async updateById(id, data) {
        const registro = await Area.findByPk(id);
        if (!registro) return null;

        await registro.update(data);
        return registro;
    },

    /**
     * Eliminar un área por ID.
     * Devuelve el número de filas eliminadas (0 o 1).
     */
    async deleteById(id) {
        return Area.destroy({
            where: { id },
        });
    },
};