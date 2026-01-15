import { Op } from "sequelize";
import { Coordinador } from "../models/coordinador.js";
import { CoordinadorSedes } from "../models/coordinador_sedes.js";
import { Sede } from "../models/sede.js";

export const coordinadorRepository = {
    async findAll({ page = 1, limit = 20, nombre, documento } = {}) {
        const where = {};
        if (nombre) where.nombre = { [Op.like]: `%${nombre}%` };
        if (documento) where.documento = { [Op.like]: `%${documento}%` };

        const offset = (Number(page) - 1) * Number(limit);

        const { rows, count } = await Coordinador.findAndCountAll({
            where,
            offset,
            limit: Number(limit),
            order: [["nombre", "ASC"]],
            distinct: true,
            include: [
                {
                    model: Sede,
                    as: "sedes",
                    attributes: ["id", "nombre"],
                    // Traemos los datos para poder mostrarlos en el formulario
                    through: {
                        attributes: ["vigenciaId", "tipo", "jornada"]
                    }
                }
            ]
        });

        return { items: rows, total: count, page: Number(page), limit: Number(limit) };
    },

    async findById(id) {
        return Coordinador.findByPk(id, {
            include: [{
                model: Sede,
                as: "sedes",
                through: { attributes: ["vigenciaId", "tipo", "jornada"] },
            }],
        });
    },

    async create(payload, transaction) {
        return Coordinador.create(payload, { transaction });
    },

    async updateById(id, payload, transaction) {
        const registro = await Coordinador.findByPk(id);
        if (!registro) return null;
        return registro.update(payload, { transaction });
    },

    // Transacción obligatoria para evitar error 500
    async deleteById(id, transaction) {
        return Coordinador.destroy({ where: { id }, transaction });
    },

    async createAsignacion(payload, transaction) {
        return CoordinadorSedes.create(payload, { transaction });
    },

    async findAsignacionConflictiva({ sedeId, vigenciaId, tipo, jornada }, transaction) {
        const where = { sedeId, vigenciaId, tipo };
        if (tipo === 'CONVIVENCIA') where.jornada = jornada;
        return CoordinadorSedes.findOne({ where, transaction });
    },

    async deleteAsignacionesPorCoordinador(coordinadorId, transaction) {
        return CoordinadorSedes.destroy({ where: { coordinadorId }, transaction });
    }
};