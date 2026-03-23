import { Op } from "sequelize";
import { Usuario } from "../models/usuario.js";
import { sendSuccess } from "../middleware/responseHandler.js";

export const usuarioController = {
    // Listar usuarios (con paginación y filtro por nombre)
    async list(req, res, next) {
        try {
            const { page = 1, limit = 20, nombre } = req.query;
            const offset = (page - 1) * limit;
            const where = {};

            // Filtro por nombre o apellidos (si se proporciona)
            if (nombre) {
                where[Op.or] = [
                    { nombre: { [Op.like]: `%${nombre}%` } },
                    { apellidos: { [Op.like]: `%${nombre}%` } },
                    { documento: { [Op.like]: `%${nombre}%` } }
                ];
            }

            const { rows, count } = await Usuario.findAndCountAll({
                where,
                offset: Number(offset),
                limit: Number(limit),
                attributes: { exclude: ['password'] }, // ¡Importante! No devolver passwords
                order: [['fechaCreacion', 'DESC']]
            });

            return sendSuccess(res, { items: rows, total: count }, "Lista de usuarios obtenida exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    // Actualizar usuario (Admin actualiza a otros)
    async update(req, res, next) {
        try {
            const id = Number(req.params.id);
            const { password, ...data } = req.body;

            const usuario = await Usuario.findByPk(id);
            if (!usuario) throw new Error("Usuario no encontrado");

            await usuario.update(data);

            return sendSuccess(res, usuario, "Usuario actualizado exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    async remove(req, res, next) {
        try {
            const id = Number(req.params.id);
            await Usuario.destroy({ where: { id } });
            return sendSuccess(res, null, "Usuario eliminado.");
        } catch (error) {
            next(error);
        }
    }
};