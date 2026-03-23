import { Op } from "sequelize";
import { Acudiente } from "../models/acudiente.js";
import { Usuario } from "../models/usuario.js";
import { AcudienteEstudiantes } from "../models/acudiente_estudiantes.js";

export const acudienteRepository = {
    /**
     * Listar acudientes con búsqueda flexible apuntando a la tabla Usuarios
     */
    async findAll({ page = 1, limit = 10, busqueda }) {
        const offset = (page - 1) * limit;
        const where = {};

        if (busqueda && busqueda.trim() !== "") {
            const term = `%${busqueda.trim()}%`;
            where[Op.or] = [
                { "$identidad.documento$": { [Op.like]: term } },
                { "$identidad.nombre$": { [Op.like]: term } },
                { "$identidad.apellidos$": { [Op.like]: term } },
                { "$identidad.email$": { [Op.like]: term } }
            ];
        }

        const { rows, count } = await Acudiente.findAndCountAll({
            where,
            limit: Number(limit),
            offset: Number(offset),
            include: [{
                model: Usuario,
                as: 'identidad',
                attributes: ['id', 'nombre', 'apellidos', 'documento', 'email', 'telefono', 'activo']
            }],
            order: [
                [{ model: Usuario, as: 'identidad' }, "apellidos", "ASC"],
                [{ model: Usuario, as: 'identidad' }, "nombre", "ASC"]
            ],
            subQuery: false // Fundamental cuando se filtra por relaciones
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / limit)
            }
        };
    },

    async findById(id) {
        return await Acudiente.findByPk(id, {
            include: [{
                model: Usuario,
                as: 'identidad',
                attributes: ['id', 'nombre', 'apellidos', 'documento', 'email', 'telefono', 'activo']
            }]
        });
    },

    async findByDocumento(documento) {
        // Buscamos a través de la relación de identidad
        return await Acudiente.findOne({
            include: [{
                model: Usuario,
                as: 'identidad',
                where: { documento }
            }]
        });
    },

    // Método para crear un acudiente, asumiendo que el usuario ya fue creado en la tabla central de Usuarios
    async create(data, transaction) {
        return await Acudiente.create(data, { transaction });
    },

    async update(id, data, transaction) {
        const acudiente = await Acudiente.findByPk(id, { transaction });
        if (!acudiente) return null;
        return await acudiente.update(data, { transaction });
    },

    async delete(id, transaction) {
        const acudiente = await Acudiente.findByPk(id);
        if (!acudiente) return false;
        await acudiente.destroy({ transaction });
        return true;
    },

    // Lógica para vincular un Acudiente con un Estudiante

    /**
     * Verificar si ya existe una vinculación específica.
     * Útil para evitar que un papá sea registrado dos veces como 'PADRE' del mismo hijo.
     */
    async findRelacion(acudienteId, estudianteId) {
        return await AcudienteEstudiantes.findOne({ where: { acudienteId, estudianteId } });
    },

    /**
     * Vincular un acudiente a un estudiante.
     * Crea el registro en la tabla intermedia 'acudiente_estudiantes'.
     */
    async crearRelacion({ acudienteId, estudianteId, afinidad }, transaction) {
        return await AcudienteEstudiantes.create({ acudienteId, estudianteId, afinidad }, { transaction });
    },

    /**
     * Actualiza el parentesco de una relación existente
     */
    async updateRelacion(estudianteId, acudienteId, nuevaAfinidad) {
        return await AcudienteEstudiantes.update(
            { afinidad: nuevaAfinidad },
            { where: { estudianteId, acudienteId } }
        );
    },

    /**
     * Desvincular un acudiente.
     * Elimina el registro de la tabla intermedia.
     */
    async desvincularAcudiente(estudianteId, acudienteId) {
        return await AcudienteEstudiantes.destroy({ where: { estudianteId, acudienteId } });
    }
};