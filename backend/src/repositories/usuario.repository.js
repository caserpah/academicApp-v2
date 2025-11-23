import { Usuario } from "../models/usuario.js";

export const UsuarioRepository = {
    async findByEmail(email) {
        return await Usuario.findOne({ where: { email, activo: true } });
    },
};