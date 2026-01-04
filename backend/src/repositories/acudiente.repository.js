import { Op, Sequelize } from "sequelize";
import { Acudiente } from "../models/acudiente.js";
import { AcudienteEstudiantes } from "../models/acudiente_estudiantes.js";

export const acudienteRepository = {
    /**
     * Listar acudientes con búsqueda flexible (Nombre o Documento)
     */
    async findAll({ page = 1, limit = 10, busqueda }) {
        const offset = (page - 1) * limit;
        const where = {};

        if (busqueda && busqueda.trim() !== "") {
            const term = `%${busqueda.trim()}%`;
            where[Op.or] = [
                { documento: { [Op.like]: term } },
                { primerNombre: { [Op.like]: term } },
                { primerApellido: { [Op.like]: term } },
                // Concatenación para buscar por nombre completo
                Sequelize.where(
                    Sequelize.fn('CONCAT',
                        Sequelize.col('primerNombre'), ' ',
                        Sequelize.fn('IFNULL', Sequelize.col('segundoNombre'), ''), ' ',
                        Sequelize.col('primerApellido'), ' ',
                        Sequelize.fn('IFNULL', Sequelize.col('segundoApellido'), '')
                    ),
                    { [Op.like]: term }
                )
            ];
        }

        const { rows, count } = await Acudiente.findAndCountAll({
            where,
            limit: Number(limit),
            offset: Number(offset),
            order: [["primerApellido", "ASC"]]
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
        return await Acudiente.findByPk(id);
    },

    async findByDocumento(documento) {
        return await Acudiente.findOne({ where: { documento } });
    },

    async create(data) {
        return await Acudiente.create(data);
    },

    async update(id, data) {
        const acudiente = await Acudiente.findByPk(id);
        if (!acudiente) return null;
        return await acudiente.update(data);
    },

    async delete(id) {
        const acudiente = await Acudiente.findByPk(id);
        if (!acudiente) return false;

        await acudiente.destroy();
        return true;
    },

    // Lógica para vincular un Acudiente con un Estudiante

    /**
     * Verificar si ya existe una vinculación específica.
     * Útil para evitar que un papá sea registrado dos veces como 'PADRE' del mismo hijo.
     */
    async findRelacion(acudienteId, estudianteId) {
        return await AcudienteEstudiantes.findOne({
            where: { acudienteId, estudianteId }
        });
    },

    /**
     * Vincular un acudiente a un estudiante.
     * Crea el registro en la tabla intermedia 'acudiente_estudiantes'.
     */
    async crearRelacion({ acudienteId, estudianteId, afinidad }) {
        return await AcudienteEstudiantes.create({
            acudienteId,
            estudianteId,
            afinidad
        });
    },

    /**
     * Actualiza el parentesco de una relación existente
     */
    async updateRelacion(estudianteId, acudienteId, nuevaAfinidad) {
        // Asumiendo que importaste el modelo intermedio AcudienteEstudiantes arriba
        return await AcudienteEstudiantes.update(
            { afinidad: nuevaAfinidad },
            {
                where: {
                    estudianteId,
                    acudienteId
                }
            }
        );
    },

    /**
     * Desvincular un acudiente.
     * Elimina el registro de la tabla intermedia.
     */
    async desvincularAcudiente(estudianteId, acudienteId) {
        return await AcudienteEstudiantes.destroy({
            where: {
                estudianteId,
                acudienteId
            }
        });
    }
};