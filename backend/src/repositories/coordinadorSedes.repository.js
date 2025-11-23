import { CoordinadorSedes } from "../models/coordinador_sedes.js";
import { Coordinador } from "../models/coordinador.js";
import { Sede } from "../models/sede.js";
import { Vigencia } from "../models/vigencia.js";

export const coordinadorSedesRepository = {
    async findAll(filters = {}) {
        const { vigenciaId, limit = 50, page = 1 } = filters;
        const offset = (page - 1) * limit;

        return CoordinadorSedes.findAndCountAll({
            where: { vigenciaId },
            limit,
            offset,
            order: [["id", "ASC"]],
            include: [
                {
                    model: Coordinador,
                    as: "coordinador",
                    attributes: ["id", "nombre", "documento"]
                },
                {
                    model: Sede,
                    as: "sede",
                    attributes: ["id", "nombre"]
                },
                {
                    model: Vigencia,
                    as: "vigencia",
                    attributes: ["id", "anio"]
                }
            ]
        });
    },

    async findById(id) {
        return CoordinadorSedes.findByPk(id, {
            include: [
                {
                    model: Coordinador,
                    as: "coordinador",
                    attributes: ["id", "nombre", "documento"]
                },
                {
                    model: Sede,
                    as: "sede",
                    attributes: ["id", "nombre"]
                },
                {
                    model: Vigencia,
                    as: "vigencia",
                    attributes: ["id", "anio"]
                }
            ]
        });
    },

    async create(payload) {
        return CoordinadorSedes.create(payload);
    },

    async updateById(id, payload) {
        const item = await CoordinadorSedes.findByPk(id);
        if (!item) return null;

        await item.update(payload);
        return item;
    },

    async deleteById(id) {
        return CoordinadorSedes.destroy({ where: { id } });
    },
};