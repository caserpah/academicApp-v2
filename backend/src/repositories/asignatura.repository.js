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
            limit = 20,
            vigenciaId,
            areaId,
            search,
            orderBy = "nombre",
            order = "ASC",
            attributes,
            includeVigencia = true,
            includeArea = true,
        } = params;

        const offset = (page - 1) * limit;

        const where = {};

        if (vigenciaId) {
            where.vigenciaId = vigenciaId;
        }

        if (areaId) {
            where.areaId = areaId;
        }

        if (search && search.trim() !== "") {
            const term = `%${search.trim().toUpperCase()}%`;
            where[Op.or] = [
                { codigo: { [Op.like]: term } },
                { nombre: { [Op.like]: term } },
                { abreviatura: { [Op.like]: term } }
            ];
        }

        const validOrderFields = [
            "id", "codigo", "nombre", "abreviatura",
            "promociona", "porcentual",
            "fechaCreacion", "fechaActualizacion"
        ];

        const safeOrderBy = validOrderFields.includes(orderBy) ? orderBy : "nombre";
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
            limit,
            offset,
            order: [[safeOrderBy, safeOrder]],
            attributes,
            include,
        });

        return {
            items: rows,
            page,
            limit,
            total: count
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