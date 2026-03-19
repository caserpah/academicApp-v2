import { Op } from "sequelize";
import { Carga } from "../models/carga.js";
import { Sede } from "../models/sede.js";
import { Docente } from "../models/docente.js";
import { Grupo } from "../models/grupo.js";
import { Asignatura } from "../models/asignatura.js";
import { Vigencia } from "../models/vigencia.js";
import { Grado } from "../models/grado.js";
import { Usuario } from "../models/usuario.js";

export const cargaRepository = {

    /**
     * Listado con filtros, paginación y ordenamiento.
     */
    async findAll({
        page = 1,
        limit = 20,
        busqueda,
        sedeId,
        vigenciaId,
        docenteId,
        grupoId,
        gradoId,
        jornada
    } = {}) {

        // Filtros Directos
        const where = {};
        if (sedeId) where.sedeId = sedeId;
        if (vigenciaId) where.vigenciaId = vigenciaId;
        if (docenteId) where.docenteId = docenteId;
        if (grupoId) where.grupoId = grupoId;

        // Búsqueda de Texto (Debounce)
        if (busqueda) {
            where[Op.or] = [
                { codigo: { [Op.like]: `%${busqueda}%` } },
                { '$docente.identidad.nombre$': { [Op.like]: `%${busqueda}%` } },
                { '$docente.identidad.apellidos$': { [Op.like]: `%${busqueda}%` } },
                { '$docente.identidad.documento$': { [Op.like]: `%${busqueda}%` } },
                { '$asignatura.nombre$': { [Op.like]: `%${busqueda}%` } },
                { '$grupo.nombre$': { [Op.like]: `%${busqueda}%` } }
            ];
        }

        // Configuración del Include de Grupo (Para filtros anidados)
        const grupoInclude = {
            model: Grupo,
            as: "grupo",
            attributes: ["id", "nombre", "jornada", "gradoId"],
            include: [{ model: Grado, as: "grado", attributes: ["id", "nombre"] }]
        };

        // Lógica de filtrado anidado:
        // Si se envían gradoId o jornada, debo filtrar AL GRUPO, no a la carga directamente.
        if (gradoId || jornada) {
            grupoInclude.where = {};
            if (gradoId) grupoInclude.where.gradoId = gradoId;
            if (jornada) grupoInclude.where.jornada = jornada;
        }

        const offset = (Number(page) - 1) * Number(limit);

        const { rows, count } = await Carga.findAndCountAll({
            where,
            offset,
            limit: Number(limit),
            subQuery: false, // OBLIGATORIO: Permite filtrar por las tablas incluidas (Grupo)
            order: [
                [{ model: Grupo, as: 'grupo' }, { model: Grado, as: 'grado' }, 'id', 'ASC'],
                [{ model: Grupo, as: 'grupo' }, 'nombre', 'ASC'],
                [{ model: Asignatura, as: 'asignatura' }, 'nombre', 'ASC']
            ],
            include: [
                {
                    model: Sede,
                    as: "sede",
                    attributes: ["id", "nombre"]
                },
                {
                    model: Docente,
                    as: "docente",
                    include: [{
                        model: Usuario,
                        as: 'identidad',
                        attributes: ["documento", "nombre", "apellidos"] // Solo traes lo que necesitas
                    }]
                },
                grupoInclude, // Usamos el objeto configurado arriba
                {
                    model: Asignatura,
                    as: "asignatura",
                    attributes: ["id", "nombre", "codigo", "porcentual"]
                },
                {
                    model: Vigencia,
                    as: "vigencia",
                    attributes: ["id", "anio"]
                }
            ]
        });

        return {
            items: rows,
            total: count,
            page: Number(page),
            limit: Number(limit),
        };
    },

    findById(id) {
        return Carga.findByPk(id, {
            include: [
                { model: Sede, as: "sede", attributes: ["id", "nombre"] },
                { model: Docente, as: "docente", include: [{ model: Usuario, as: 'identidad', attributes: ["documento", "nombre", "apellidos"] }] },
                { model: Grupo, as: "grupo", include: [{ model: Grado, as: "grado" }] },
                { model: Asignatura, as: "asignatura" },
                { model: Vigencia, as: "vigencia" }
            ]
        });
    },

    async create(payload, transaction) {
        return Carga.create(payload, { transaction });
    },

    async updateById(id, payload, transaction) {
        const registro = await Carga.findByPk(id);
        if (!registro) return null;
        return registro.update(payload, { transaction });
    },

    async deleteById(id, transaction) {
        return Carga.destroy({ where: { id }, transaction });
    }
};