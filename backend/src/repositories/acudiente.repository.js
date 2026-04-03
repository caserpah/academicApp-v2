import { Op } from "sequelize";
import { Acudiente } from "../models/acudiente.js";
import { Usuario } from "../models/usuario.js";
import { AcudienteEstudiantes } from "../models/acudiente_estudiantes.js";

export const acudienteRepository = {
    /**
     * Listar acudientes con búsqueda flexible apuntando a la tabla Acudientes pero filtrando por campos de Usuario (identidad)
     */
    async findAll({ page = 1, limit = 10, busqueda }) {
        const offset = (page - 1) * limit;
        const where = {};

        if (busqueda && busqueda.trim() !== "") {
            const term = `%${busqueda.trim()}%`;
            where[Op.or] = [
                { documento: { [Op.like]: term } },
                { nombres: { [Op.like]: term } },
                { apellidos: { [Op.like]: term } },
                { email: { [Op.like]: term } }
            ];
        }

        const { rows, count } = await Acudiente.findAndCountAll({
            where,
            limit: Number(limit),
            offset: Number(offset),
            include: [{
                model: Usuario,
                as: 'identidad',
                attributes: ['id', 'activo', 'requiereCambioPassword'],
                required: false // LEFT JOIN: Trae al acudiente incluso si usuarioId es NULL
            }],
            order: [
                ["apellidos", "ASC"],
                ["nombres", "ASC"]
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
                attributes: ['id', 'activo'],
                required: false
            }]
        });
    },

    async findOne(options) {
        return await Acudiente.findOne(options);
    },

    async findByDocumento(documento) {
        return await Acudiente.findOne({ where: { documento } });
    },

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

    // ============================================================
    // Lógica para Tabla Intermedia (Vincular con Estudiante)
    // ============================================================

    async findRelacion(acudienteId, estudianteId) {
        return await AcudienteEstudiantes.findOne({ where: { acudienteId, estudianteId } });
    },

    async crearRelacion(data, transaction) {
        return await AcudienteEstudiantes.create(data, { transaction });
    },

    async updateRelacion(estudianteId, acudienteId, nuevaAfinidad, transaction) {
        return await AcudienteEstudiantes.update(
            { afinidad: nuevaAfinidad },
            { where: { estudianteId, acudienteId }, transaction }
        );
    },

    async desvincularAcudiente(estudianteId, acudienteId) {
        return await AcudienteEstudiantes.destroy({ where: { estudianteId, acudienteId } });
    },

    async verificarParentesco(estudianteId, afinidad) {
        return await AcudienteEstudiantes.findOne({
            where: { estudianteId, afinidad }
        });
    }
};