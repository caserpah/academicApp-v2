import { Usuario } from '../models/usuario.js';
import jwt from 'jsonwebtoken';

/**
 * @description Genera un JWT para el usuario autenticado.
 * @param {object} usuario - Objeto del modelo Usuario.
 * @returns {string} Token JWT.
 */
const generarJWT = (usuario) => {
    // Datos sensibles a incluir en el payload del token
    const payload = {
        id: usuario.id,
        role: usuario.role,
        documento: usuario.numeroDocumento
    };

    // Secret Key se obtiene de las variables de entorno para mayor seguridad
    return jwt.sign(
        payload,
        process.env.JWT_SECRET, // Se recomienda usar una clave secreta fuerte y rotarla
        { expiresIn: '1h' }    // El token expira en 1 hora
    );
};

/**
 * @route POST /api/auth/register
 * @description Crea un nuevo usuario.
 */
export const register = async (req, res, next) => {
    // Campos permitidos del cuerpo de la solicitud
    const { nombreCompleto, numeroDocumento, contacto, email, password, role } = req.body;

    try {
        const nuevoUsuario = await Usuario.create({
            nombreCompleto,
            numeroDocumento,
            contacto,
            email,
            password,
            role: role || 'acudiente' // Asegura un rol por defecto si no se proporciona
        });

        // Generar token inmediatamente después del registro
        const token = generarJWT(nuevoUsuario);

        // Respuesta exitosa (201 Created)
        res.status(201).json({
            message: 'Registro exitoso.',
            token,
            usuario: {
                id: nuevoUsuario.id,
                email: nuevoUsuario.email,
                role: nuevoUsuario.role,
                nombreCompleto: nuevoUsuario.nombreCompleto
            }
        });

    } catch (error) {
        // En caso de error de unicidad (ej. email o documento ya existen)
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'El email o número de documento ya están registrados.' });
        }
        next(error);
    }
};

/**
 * @route POST /api/auth/login
 * @description Autentica un usuario y devuelve un token.
 */
export const login = async (req, res, next) => {
    const { email, password } = req.body;

    // Validación básica de campos requeridos (aunque se debe complementar con express-validator)
    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }

    try {
        // 1. Buscar usuario por email
        const usuario = await Usuario.findOne({ where: { email } });

        // 2. Verificar existencia y estado activo
        if (!usuario || !usuario.activo) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 3. Comparar contraseña hasheada
        const isMatch = await usuario.validarPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 4. Generar Token JWT
        const token = generarJWT(usuario);

        // 5. Respuesta exitosa (200 OK)
        res.status(200).json({
            message: 'Inicio de sesión exitoso.',
            token,
            usuario: {
                id: usuario.id,
                email: usuario.email,
                role: usuario.role,
                nombreCompleto: usuario.nombreCompleto
            }
        });

    } catch (error) {
        next(error);
    }
};