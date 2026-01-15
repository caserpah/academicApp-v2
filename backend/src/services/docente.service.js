import { docenteRepository } from "../repositories/docente.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { sequelize } from "../database/db.connect.js";

export const docenteService = {

    /**
     * Listado con paginación y ordenamiento
     */
    async list(params) {
        return await docenteRepository.findAll(params);
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
        const t = await sequelize.transaction();
        try {
            // Se crea el docente. Las validaciones de unicidad (documento/email)
            // las maneja el Validator antes de llegar aquí o el handleSequelizeError si fallan.
            const nuevo = await docenteRepository.create(data, t);

            await t.commit();

            // Retornamos el objeto completo con su área (si la tiene)
            const completo = await docenteRepository.findById(nuevo.id);
            return { message: "Docente registrado exitosamente.", data: completo };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar docente por ID
     */
    async update(id, data) {
        const t = await sequelize.transaction();
        try {
            const actualizado = await docenteRepository.updateById(id, data, t);

            if (!actualizado) {
                throw new Error("No se encontró el docente solicitado.");
            }

            await t.commit();

            // Retornamos el objeto completo con su área (si la tiene)
            const completo = await docenteRepository.findById(id);
            return { message: "Docente actualizado exitosamente.", data: completo };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar docente
     */
    async remove(id) {
        const t = await sequelize.transaction();
        try {
            // Nota: Si el docente tiene Cargas o Grupos asociados, el FK constraint
            // saltará aquí y será capturado por handleSequelizeError.
            const deleted = await docenteRepository.deleteById(id, t);

            if (!deleted) {
                new Error("No se encontró el docente solicitado para eliminar.");
            }

            await t.commit();
            return { message: "Docente eliminado exitosamente." };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    }
};