import { indicadorRepository } from "../repositories/indicador.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

export const indicadorService = {

    async list(params, vigenciaId) {
        const filters = {
            vigenciaId,
            ...(params.periodo && { periodo: params.periodo }),
            ...(params.activo && { activo: params.activo })
        };

        return indicadorRepository.findAll(filters);
    },

    /**
     * Obtener detalle de un indicador.
     */
    async get(id, vigenciaId) {
        const registro = await indicadorRepository.findById(id, vigenciaId);

        if (!registro) {
            const err = new Error("No se encontró el indicador solicitado.");
            err.status = 404;
            throw err;
        }

        return registro;
    },

    /**
     * Crear nuevo indicador (usa la vigencia activa).
     */
    async create(data, vigenciaId) {
        try {
            // Desestructuración — solo campos permitidos
            const { periodo, descripcion, activo } = data;

            const nuevo = await indicadorRepository.create({
                periodo,
                descripcion,
                activo: activo ?? true,
                vigenciaId
            });

            return indicadorRepository.findById(nuevo.id, vigenciaId);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar área existente.
     */
    async update(id, data, vigenciaId) {
        try {
            const actual = await indicadorRepository.findById(id, vigenciaId);

            if (!actual) {
                const err = new Error("No se encontró el indicador solicitado.");
                err.status = 404;
                throw err;
            }

            // Desestructuración — solo campos actualizables
            const camposActualizables = {};

            if (data.periodo !== undefined) camposActualizables.periodo = data.periodo;
            if (data.descripcion !== undefined) camposActualizables.descripcion = data.descripcion;
            if (data.activo !== undefined) camposActualizables.activo = data.activo;

            await indicadorRepository.updateById(id, camposActualizables);

            return indicadorRepository.findById(id, vigenciaId);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar indicador.
     */
    async remove(id, vigenciaId) {
        try {
            const indicador = await indicadorRepository.findById(id, vigenciaId);

            if (!indicador) {
                const err = new Error("No se encontró el indicador solicitado.");
                err.status = 404;
                throw err;
            }

            const eliminado = await indicadorRepository.deleteById(id);

            if (!eliminado) {
                const err = new Error("No se pudo eliminar el indicador.");
                err.status = 500;
                throw err;
            }

            return { message: "El indicador fue eliminado exitosamente." };

        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "este indicador",
                "juicios asociados"
            );
        }
    }
};