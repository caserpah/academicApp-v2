import { docenteRepository } from "../repositories/docente.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

export const docenteService = {

    /**
     * Listado con filtros, paginación y ordenamiento
     */
    async list(params) {
        const page = Number(params.page) || 1;
        const limit = Number(params.limit) || 10;

        const orderBy = params.orderBy || "apellidos";
        const order = params.order || "ASC";

        return docenteRepository.findAll({
            ...params,
            page,
            limit,
            orderBy,
            order
        });
    },

    /**
     * Obtener docente por ID
     */
    async get(id) {
        const registro = await docenteRepository.findById(id);

        if (!registro) {
            const err = new Error("No se encontró el docente solicitado.");
            err.status = 404;
            throw err;
        }

        return registro;
    },

    /**
     * Crear docente
     */
    async create(data) {
        try {
            const {
                documento,
                nombre,
                apellidos,
                fechaNacimiento,
                email,
                telefono,
                nivelEducativo,
                nivelEnsenanza,
                decretoLey,
                escalafon,
                decretoNombrado,
                fechaNombrado,
                vinculacion,
                fechaIngreso,
                fechaRetiro,
                direccion,
                activo,
                areaId
            } = data;

            const nuevo = await docenteRepository.create({
                documento,
                nombre,
                apellidos,
                fechaNacimiento,
                email,
                telefono,
                nivelEducativo,
                nivelEnsenanza,
                decretoLey,
                escalafon,
                decretoNombrado,
                fechaNombrado,
                vinculacion,
                fechaIngreso,
                fechaRetiro,
                direccion,
                activo: activo ?? true,
                areaId
            });

            return docenteRepository.findById(nuevo.id);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },


    /**
     * Actualizar docente por ID
     */
    async update(id, data) {
        try {
            const actual = await docenteRepository.findById(id);

            if (!actual) {
                const err = new Error("No se encontró el docente solicitado.");
                err.status = 404;
                throw err;
            }

            /** Solo permitir actualizar campos válidos */
            const camposActualizables = {};

            const camposPermitidos = [
                "documento",
                "nombre",
                "apellidos",
                "fechaNacimiento",
                "email",
                "telefono",
                "nivelEducativo",
                "nivelEnsenanza",
                "decretoLey",
                "escalafon",
                "decretoNombrado",
                "fechaNombrado",
                "vinculacion",
                "fechaIngreso",
                "fechaRetiro",
                "direccion",
                "activo",
                "areaId"
            ];

            for (const campo of camposPermitidos) {
                if (data[campo] !== undefined) {
                    camposActualizables[campo] = data[campo];
                }
            }

            await docenteRepository.updateById(id, camposActualizables);

            return docenteRepository.findById(id);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar docente
     */
    async remove(id) {
        try {
            const registro = await docenteRepository.findById(id);

            if (!registro) {
                const err = new Error("No se encontró el docente solicitado.");
                err.status = 404;
                throw err;
            }

            await docenteRepository.deleteById(id);
            return true;

        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "este docente",
                "cargas académicas o grupos dirigidos"
            );
        }
    }
};