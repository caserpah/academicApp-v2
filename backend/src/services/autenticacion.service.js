import bcrypt from "bcrypt";
import { UsuarioRepository } from "../repositories/usuario.repository.js";
import { generateToken } from "../utils/jwt.js";
import { AppError } from "../utils/appError.js";

export const AutenticacionService = {
    async login({ email, password }) {
        const usuario = await UsuarioRepository.findByEmail(email);
        if (!usuario) throw new AppError("Usuario no encontrado.", 404);

        const valid = await bcrypt.compare(password, usuario.password);
        if (!valid) throw new AppError("Contraseña incorrecta.", 401);

        const payload = { id: usuario.id, role: usuario.role };
        const token = generateToken(payload);

        return {
            message: "Autenticación exitosa",
            token,
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellidos: usuario.apellidos,
                email: usuario.email,
                role: usuario.role,
            },
        };
    },
};