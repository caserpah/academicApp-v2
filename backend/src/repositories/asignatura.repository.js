import { Op } from "sequelize";
import { Asignatura } from "../models/asignatura.js";
import { Area } from "../models/area.js";
import { Vigencia } from "../models/vigencia.js";

/**
 * Repository: Asignatura
 * Encapsula el acceso a datos de las asignaturas.
 */
export const asignaturaRepository = {
    /**
     * Listado con paginación, filtros y búsqueda.
     */
    async findAll(params = {}) {
        const {
            page = 1,
            limit = 10,
            vigenciaId,
            areaId,
            search,
            orderBy = "codigo",
            order = "ASC",
            attributes,
            includeVigencia = true,
            includeArea = true,
        } = params;

        // Convertimos explícitamente a enteros para evitar el error de sintaxis SQL
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const offset = (pageNum - 1) * limitNum;

        const where = {};

        if (vigenciaId) where.vigenciaId = vigenciaId;

        // Filtro exacto por Área
        if (areaId) where.areaId = areaId;

        // Búsqueda por texto (Debounce)
        if (search && search.trim() !== "") {
            const term = `%${search.trim().toUpperCase()}%`;
            where[Op.or] = [
                { codigo: { [Op.like]: term } },
                { nombre: { [Op.like]: term } },
                { abreviatura: { [Op.like]: term } }
            ];
        }

        const validOrderFields = ["id", "codigo", "nombre", "abreviatura", "promociona", "porcentual"];
        const safeOrderBy = validOrderFields.includes(orderBy) ? orderBy : "codigo";
        const safeOrder = order?.toUpperCase() === "DESC" ? "DESC" : "ASC";

        const include = [];

        if (includeArea) {
            include.push({
                model: Area,
                as: "area",
                attributes: ["id", "nombre"]
            });
        }

        if (includeVigencia) {
            include.push({
                model: Vigencia,
                as: "vigencia",
                attributes: ["id", "anio"]
            });
        }

        const { rows, count } = await Asignatura.findAndCountAll({
            where,
            limit: limitNum,
            offset: offset,
            order: [[safeOrderBy, safeOrder]],
            attributes,
            include,
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(count / limitNum)
            }
        };
    },

    /**
     * Buscar por ID con includes opcionales.
     */
    async findById(id, options = {}) {
        const {
            includeArea = true,
            includeVigencia = true,
            attributes
        } = options;

        const include = [];

        if (includeArea) {
            include.push({
                model: Area,
                as: "area",
                attributes: ["id", "nombre"]
            });
        }

        if (includeVigencia) {
            include.push({
                model: Vigencia,
                as: "vigencia",
                attributes: ["id", "anio"]
            });
        }

        return Asignatura.findByPk(id, {
            attributes,
            include,
        });
    },

    /**
     * Crear asignatura
     */
    async create(data) {
        return Asignatura.create(data);
    },

    /**
     * Actualizar asignatura
     */
    async updateById(id, data) {
        const registro = await Asignatura.findByPk(id);
        if (!registro) return null;

        await registro.update(data);
        return registro;
    },

    /**
     * Eliminar asignatura
     */
    async deleteById(id) {
        return Asignatura.destroy({
            where: { id }
        });
    },
};