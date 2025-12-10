import { Carga } from "../models/carga.js";
import { Docente } from "../models/docente.js";
import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Sede } from "../models/sede.js";
import { Asignatura } from "../models/asignatura.js";

export const cargaRepository = {

    /**
     * Listado con filtros, paginación y ordenamiento.
     */
    async findAll({
        sedeId,
        docenteId,
        grupoId,
        asignaturaId,
        vigenciaId,
        page,
        limit,
        orderBy,
        order
    }) {
        const where = { vigenciaId };

        if (docenteId) where.docenteId = docenteId;
        if (grupoId) where.grupoId = grupoId;
        if (asignaturaId) where.asignaturaId = asignaturaId;
        if (sedeId) where.sedeId = sedeId;

        const offset = (page - 1) * limit;

        const { rows, count } = await Carga.findAndCountAll({
            where,
            limit,
            offset,
            order: [[orderBy, order]],
            include: [
                {
                    model: Docente,
                    as: "docente",
                    attributes: ["id", "nombre", "apellidos", "documento"]
                },
                {
                    model: Grupo,
                    as: "grupo",
                    attributes: ["id", "nombre", "jornada"],
                    include: [
                        {
                            model: Grado,
                            as: "grado",
                            attributes: ["id", "nombre", "codigo"]
                        }
                    ]
                },
                {
                    model: Sede,
                    as: "sede",
                    attributes: ["id", "codigo", "nombre"]
                },
                {
                    model: Asignatura,
                    as: "asignatura",
                    attributes: ["id", "codigo", "nombre", "abreviatura"]
                }
            ]
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page,
                limit,
                totalPages: Math.ceil(count / limit)
            }
        };
    },

    findById(id, vigenciaId) {
        return Carga.findOne({
            where: { id, vigenciaId },
            include: [
                {
                    model: Docente,
                    as: "docente",
                    attributes: ["id", "nombre", "apellidos", "documento"]
                },
                {
                    model: Grupo,
                    as: "grupo",
                    attributes: ["id", "nombre", "jornada"],
                    include: [
                        {
                            model: Grado,
                            as: "grado",
                            attributes: ["id", "nombre", "codigo"]
                        }
                    ]
                },
                {
                    model: Sede,
                    as: "sede",
                    attributes: ["id", "codigo", "nombre"]
                },
                {
                    model: Asignatura,
                    as: "asignatura",
                    attributes: ["id", "codigo", "nombre", "abreviatura"]
                }
            ]
        });
    },

    create(data) {
        return Carga.create(data);
    },

    async updateById(id, vigenciaId, data) {
        const registro = await Carga.findOne({ where: { id, vigenciaId } });
        if (!registro) return null;

        await registro.update(data);
        return registro;
    },

    async deleteById(id, vigenciaId) {
        return Carga.destroy({ where: { id, vigenciaId } });
    }
};