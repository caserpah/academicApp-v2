import { Op } from "sequelize";
import { Docente } from "../models/docente.js";

export const docenteRepository = {

    /**
     * Listado con filtros + paginación + ordenamiento
     */
    async findAll({ page = 1, limit = 20, busqueda } = {}) {
        const where = {};

        // Búsqueda flexible por nombre, apellido o documento
        if (busqueda) {
            const term = `%${busqueda}%`;
            const busquedaLower = busqueda.toLowerCase();

            const orConditions = [
                { nombre: { [Op.like]: term } },
                { apellidos: { [Op.like]: term } },
                { documento: { [Op.like]: term } },
                { profesion: { [Op.like]: term } },
                { vinculacion: { [Op.like]: term } },
                { areaEnsenanza: { [Op.like]: term } }
            ];

            if ("activo".includes(busquedaLower)) orConditions.push({ activo: true });
            if ("inactivo".includes(busquedaLower)) orConditions.push({ activo: false });

            where[Op.or] = orConditions;
        }

        /** Paginación */
        const offset = (Number(page) - 1) * Number(limit);

        /** Consulta */
        const { rows, count } = await Docente.findAndCountAll({
            where,
            offset,
            limit: Number(limit),
            order: [["apellidos", "ASC"], ["nombre", "ASC"]],
        });

        return {
            items: rows,
            total: count,
            page: Number(page),
            limit: Number(limit),
        };
    },

    /**
     * Buscar por ID
     */
    async findById(id) {
        return Docente.findByPk(id);
    },

    /**
     * Crear un docente
     */
    async create(payload, transaction) {
        return Docente.create(payload, { transaction });
    },

    /**
     * Actualizar docente por ID
     */
    async updateById(id, payload, transaction) {
        const registro = await Docente.findByPk(id);
        if (!registro) return null;
        return registro.update(payload, { transaction });
    },

    /**
     * Eliminar docente por ID
     */
    async deleteById(id, transaction) {
        return Docente.destroy({ where: { id }, transaction });
    }
};