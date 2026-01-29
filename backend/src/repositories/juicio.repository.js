import { Op } from "sequelize";
import { Juicio } from "../models/juicio.js";
import { Asignatura } from "../models/asignatura.js";
import { Grado } from "../models/grado.js";
import { Dimension } from "../models/dimension.js";
import { Desempeno } from "../models/desempeno.js";

// Helper para identificar si un grado es Preescolar (Excepción de la regla)
const esGradoPreescolar = (nombreGrado) => {
    const normalizado = nombreGrado ? nombreGrado.trim().toUpperCase() : "";
    return ["PRE_JARDIN", "PRE JARDIN", "JARDIN", "TRANSICION", "TRANSICIÓN"].includes(normalizado);
};

export const juicioRepository = {

    /**
     * Listar juicios con filtros, paginación y ordenamiento.
     */
    async findAll({
        vigenciaId,
        gradoId,
        dimensionId,
        desempenoId,
        asignaturaId,
        periodo,
        activo,
        search,
        page,
        limit,
        orderBy,
        order
    }) {
        // Filtro base: siempre por vigencia
        const where = { vigenciaId };

        // Filtro explícito de estado
        if (activo !== undefined && activo !== null && activo !== "") {
            where.activo = (String(activo) === "true");
        }

        // Filtros opcionales específicos
        if (gradoId) where.gradoId = gradoId;
        if (dimensionId) where.dimensionId = dimensionId;
        if (desempenoId) where.desempenoId = desempenoId;
        if (asignaturaId) where.asignaturaId = asignaturaId;
        if (periodo) where.periodo = periodo;

        // Si hay término de búsqueda, aplicamos búsqueda global multi-campo
        if (search) {
            const term = search.trim();
            const termUpper = term.toUpperCase();
            const likeTerm = `%${term}%`;

            // Definimos las columnas donde buscamos texto normalmente
            const orConditions = [
                { texto: { [Op.like]: likeTerm } },
                { '$grado.nombre$': { [Op.like]: likeTerm } },
                { '$asignatura.nombre$': { [Op.like]: likeTerm } },
                { '$dimension.nombre$': { [Op.like]: likeTerm } },
                { '$desempeno.nombre$': { [Op.like]: likeTerm } }
            ];

            // --- LÓGICA PARA DETECTAR ESTADO EN EL TEXTO ---
            // Si el usuario escribe algo que parece "INACTIVO" (ej: "INA", "INACTIVO")
            if ("INACTIVO".includes(termUpper) && termUpper.length >= 3) {
                orConditions.push({ activo: false });
            }
            // Si escribe algo que parece "ACTIVO" (ej: "ACT", "ACTIVO") pero NO "INACTIVO"
            else if ("ACTIVO".includes(termUpper) && termUpper.length >= 3) {
                orConditions.push({ activo: true });
            }

            // Agregamos el bloque OR al WHERE principal
            where[Op.and] = [
                ...(where[Op.and] || []),
                { [Op.or]: orConditions }
            ];
        }

        const offset = (page - 1) * limit;

        const { rows, count } = await Juicio.findAndCountAll({
            where,
            limit: Number(limit),
            offset: Number(offset),
            order: [[orderBy || 'id', order || 'DESC']],
            // Es necesario subQuery: false cuando filtramos por columnas de tablas incluidas ($tabla.col$)
            // para que la paginación (limit/offset) funcione correctamente sobre el resultado final.
            subQuery: false,
            include: [
                { model: Asignatura, as: "asignatura", attributes: ["id", "codigo", "nombre", "abreviatura"] },
                { model: Grado, as: "grado", attributes: ["id", "nombre", "codigo", "modalidad"] },
                { model: Dimension, as: "dimension", attributes: ["id", "nombre", "codigo"] },
                { model: Desempeno, as: "desempeno", attributes: ["id", "nombre", "codigo", "orden"] },
            ]
        });

        return {
            items: rows,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / limit)
            },
        };
    },

    findById(id, vigenciaId) {
        return Juicio.findOne({
            where: { id, vigenciaId },
            include: [
                { model: Asignatura, as: "asignatura", attributes: ["id", "codigo", "nombre", "abreviatura"] },
                { model: Grado, as: "grado", attributes: ["id", "nombre", "codigo", "modalidad"] },
                { model: Dimension, as: "dimension", attributes: ["id", "nombre", "codigo"] },
                { model: Desempeno, as: "desempeno", attributes: ["id", "nombre", "codigo", "orden"] },
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