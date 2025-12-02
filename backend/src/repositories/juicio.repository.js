import { Juicio } from "../models/juicio.js";
import { Asignatura } from "../models/asignatura.js";
import { Grado } from "../models/grado.js";
import { Dimension } from "../models/dimension.js";
import { Desempeno } from "../models/desempeno.js";

export const juicioRepository = {
    async findAll({
        vigenciaId,
        gradoId,
        dimensionId,
        desempenoId,
        asignaturaId,
        periodo,
        incluyeInactivos,
        page,
        limit,
        orderBy,
        order
    }) {
        const where = { vigenciaId };

        if (!incluyeInactivos) where.activo = true;
        if (gradoId) where.gradoId = gradoId;
        if (dimensionId) where.dimensionId = dimensionId;
        if (desempenoId) where.desempenoId = desempenoId;
        if (asignaturaId) where.asignaturaId = asignaturaId;
        if (periodo) where.periodo = periodo;

        const offset = (page - 1) * limit;

        const { rows, count } = await Juicio.findAndCountAll({
            where,
            limit,
            offset,
            order: [[orderBy, order]],
            include: [
                { model: Asignatura, as: "asignatura", attributes: ["codigo", "nombre", "abreviatura"] },
                { model: Grado, as: "grado", attributes: ["nombre", "codigo", "modalidad"] },
                { model: Dimension, as: "dimension", attributes: ["nombre", "codigo"] },
                { model: Desempeno, as: "desempeno", attributes: ["nombre", "codigo", "orden"] },
            ]
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit),
            },
        };
    },

    findById(id, vigenciaId) {
        return Juicio.findOne({
            where: { id, vigenciaId },
            include: [
                { model: Asignatura, as: "asignatura", attributes: ["codigo", "nombre", "abreviatura"] },
                { model: Grado, as: "grado", attributes: ["nombre", "codigo", "modalidad"] },
                { model: Dimension, as: "dimension", attributes: ["nombre", "codigo"] },
                { model: Desempeno, as: "desempeno", attributes: ["nombre", "codigo", "orden"] },
            ],
        });
    },

    create(data) {
        return Juicio.create(data);
    },

    async updateById(id, data) {
        const registro = await Juicio.findByPk(id);
        if (!registro) return null;

        await registro.update(data);
        return registro;
    },

    async deleteById(id, vigenciaId) {
        const registro = await Juicio.findOne({ where: { id, vigenciaId } });
        if (!registro) return false;

        await registro.destroy();
        return true;
    },
};