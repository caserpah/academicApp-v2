import { Op } from "sequelize";
import { Docente } from "../models/docente.js";
import { Usuario } from "../models/usuario.js";

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
                { "$identidad.nombre$": { [Op.like]: term } },
                { "$identidad.apellidos$": { [Op.like]: term } },
                { "$identidad.documento$": { [Op.like]: term } },
                { '$identidad.email$': { [Op.like]: term } },
                { profesion: { [Op.like]: term } },
                { vinculacion: { [Op.like]: term } },
                { areaEnsenanza: { [Op.like]: term } },
                { decretoLey: { [Op.like]: term } }
            ];

            // El estado 'activo' viene desde Usuario
            if ("activo".includes(busquedaLower)) where['$identidad.activo$'] = true;
            if ("inactivo".includes(busquedaLower)) where['$identidad.activo$'] = false;

            where[Op.or] = orConditions;
        }

        /** Paginación */
        const offset = (Number(page) - 1) * Number(limit);

        /** Consulta */
        const { rows, count } = await Docente.findAndCountAll({
            where,
            offset,
            limit: Number(limit),
            // Incluimos la identidad para que el frontend tenga todos los datos
            include: [{
                model: Usuario,
                as: 'identidad',
                attributes: ['id', 'nombre', 'apellidos', 'documento', 'email', 'telefono', 'activo']
            }],
            // Ordenamos por los apellidos y nombres del Usuario
            order: [
                [{ model: Usuario, as: 'identidad' }, "apellidos", "ASC"],
                [{ model: Usuario, as: 'identidad' }, "nombre", "ASC"]
            ],
            subQuery: false // Obligatorio en Sequelize cuando se filtra por campos de un include
        });

        return {
            items: rows,
            total: count,
            page: Number(page),
            limit: Number(limit),
        };
    },

    /**
     * Buscar por ID (Trae el docente con su identidad)
     */
    async findById(id) {
        return Docente.findByPk(id, {
            include: [{
                model: Usuario,
                as: 'identidad',
                attributes: { exclude: ['password', 'otpCode', 'otpExpires'] } // Ocultamos datos sensibles
            }]
        });
    },

    /**
     * Buscar un perfil de docente por el ID del usuario central
     */
    async findByUsuarioId(usuarioId, transaction = null) {
        return await Docente.findOne({
            where: { usuarioId },
            transaction // Pasamos la transacción por si viene del servicio
        });
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