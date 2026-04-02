import { Op } from "sequelize";
import { sequelize } from "../database/db.connect.js";
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
        jornada,
        asignaturaId
    } = {}) {

        // Filtros Directos
        const where = {};
        if (sedeId) where.sedeId = sedeId;
        if (vigenciaId) where.vigenciaId = vigenciaId;
        if (docenteId) where.docenteId = docenteId;
        if (grupoId) where.grupoId = grupoId;
        if (asignaturaId) where.asignaturaId = asignaturaId;

        // Búsqueda de Texto (Debounce)
        if (busqueda) {
            const termino = `%${busqueda.trim()}%`;
            where[Op.or] = [
                { codigo: { [Op.like]: termino } },
                { '$asignatura.nombre$': { [Op.like]: termino } },
                { '$grupo.nombre$': { [Op.like]: termino } },
                { '$docente.identidad.documento$': { [Op.like]: termino } },
                { '$docente.identidad.nombre$': { [Op.like]: termino } },
                { '$docente.identidad.apellidos$': { [Op.like]: termino } },
                // Permite buscar por el nombre completo (Ej: Juan Perez)
                sequelize.where(
                    sequelize.fn('CONCAT', sequelize.col('docente->identidad.nombre'), ' ', sequelize.col('docente->identidad.apellidos')),
                    { [Op.like]: termino }
                ),
                // Permite buscar por apellidos y luego nombres (Ej: Perez Juan)
                sequelize.where(
                    sequelize.fn('CONCAT', sequelize.col('docente->identidad.apellidos'), ' ', sequelize.col('docente->identidad.nombre')),
                    { [Op.like]: termino }
                )
            ];
        }

        // Configuración del Include de Grupo (Agregamos duplicating: false)
        const grupoInclude = {
            model: Grupo,
            as: "grupo",
            attributes: ["id", "nombre", "jornada", "gradoId"],
            duplicating: false,
            include: [{ model: Grado, as: "grado", attributes: ["id", "nombre"], duplicating: false }]
        };

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
            subQuery: false,
            order: [
                [{ model: Grupo, as: 'grupo' }, { model: Grado, as: 'grado' }, 'id', 'ASC'],
                [{ model: Grupo, as: 'grupo' }, 'nombre', 'ASC'],
                [{ model: Asignatura, as: 'asignatura' }, 'nombre', 'ASC']
            ],
            include: [
                {
                    model: Sede,
                    as: "sede",
                    attributes: ["id", "nombre"],
                    duplicating: false
                },
                {
                    model: Docente,
                    as: "docente",
                    duplicating: false,
                    include: [{
                        model: Usuario,
                        as: 'identidad',
                        attributes: ["documento", "nombre", "apellidos"],
                        duplicating: false,
                    }]
                },
                grupoInclude,
                {
                    model: Asignatura,
                    as: "asignatura",
                    attributes: ["id", "nombre", "codigo", "porcentual"],
                    duplicating: false
                },
                {
                    model: Vigencia,
                    as: "vigencia",
                    attributes: ["id", "anio"],
                    duplicating: false
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