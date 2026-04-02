import { Op } from "sequelize";
import { Usuario } from "../models/usuario.js";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { emailService } from '../services/email.service.js';

/**
 * @description Genera un JWT para el usuario autenticado.
 * @param {object} usuario - Objeto del modelo Usuario.
 * @returns {string} Token JWT.
 */
const generarJWT = (usuario) => {
    // Secret Key se obtiene de las variables de entorno para mayor seguridad
    return jwt.sign(
        { id: usuario.id, role: usuario.role, documento: usuario.documento },
        process.env.JWT_SECRET, // Se recomienda usar una clave secreta fuerte y rotarla
        { expiresIn: '12h' }    // El token expira en 12 horas
    );
};

/**
 * @route POST /api/auth/register
 * @description Crea un nuevo usuario.
 */
export const register = async (req, res, next) => {
    // Campos permitidos del cuerpo de la solicitud
    const { nombre, apellidos, documento, contacto, email, password, role } = req.body;

    try {
        const nuevoUsuario = await Usuario.create({
            nombre,
            apellidos,
            documento,
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
                nombre: nuevoUsuario.nombre,
                apellidos: nuevoUsuario.apellidos
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
 * @description Autentica un usuario (o lo crea al vuelo si es acudiente) y evalúa el Onboarding.
 */
export const login = async (req, res, next) => {
    const { identificador, password } = req.body;

    if (!identificador) {
        return res.status(400).json({ message: 'Ingrese número de documento o correo electrónico.' });
    }

    if (!password) {
        return res.status(400).json({ message: 'La contraseña es requerida.' });
    }

    try {
        // 1. Buscar usuario por email o documento en la TABLA CENTRAL (Usuarios)
        const usuario = await Usuario.findOne({
            where: {
                [Op.or]: [
                    { email: identificador },
                    { documento: identificador }
                ]
            }
        });

        // 2. Si no existe en Usuarios, rechazamos de inmediato.
        // (Ya no buscamos en Acudiente porque el documento ya no vive ahí)
        if (!usuario) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 3. Validar si está activo
        if (!usuario.activo) {
            return res.status(401).json({ message: 'Usuario inactivo. Contacte a administración.' });
        }

        // 4. Comparar contraseña hasheada
        const isMatch = await usuario.validarPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 5. Verificar si el usuario requiere cambio de contraseña (Onboarding)
        if (usuario.requiereCambioPassword) {
            return res.status(200).json({
                status: 'success',
                requireOnboarding: true,
                usuarioId: usuario.id,
                message: 'Por políticas de seguridad, debe actualizar su correo y contraseña.'
            });
        }

        // 6. Lógica normal OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 5 * 60000);

        usuario.otpCode = await bcrypt.hash(otpCode, 10);
        usuario.otpExpires = otpExpires;
        await usuario.save();

        await emailService.sendOTP(usuario.email, otpCode);

        res.status(200).json({
            status: 'success',
            message: 'Credenciales correctas. Código de verificación enviado.',
            requireOTP: true,
            email: usuario.email
        });

    } catch (error) {
        // Ahora, si hay un error real de base de datos, lo pasará al manejador global
        next(error);
    }
};

/**
 * @route POST /api/auth/onboarding
 * @description Procesa la primera actualización obligatoria de datos.
 */
export const completarOnboarding = async (req, res, next) => {
    const { usuarioId, email, newPassword } = req.body;

    try {
        const usuario = await Usuario.findByPk(usuarioId);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Evitar correos duplicados
        const emailEnUso = await Usuario.findOne({ where: { email, id: { [Op.ne]: usuarioId } } });
        if (emailEnUso) {
            return res.status(409).json({ message: 'El correo electrónico ya está en uso.' });
        }

        // Actualizar Usuario (el hook beforeUpdate hasheará la newPassword)
        usuario.email = email;
        usuario.password = newPassword;
        usuario.requiereCambioPassword = false; // ¡Desbloqueado!
        await usuario.save();

        res.status(200).json({
            status: 'success',
            message: 'Datos actualizados correctamente. Por favor, inicie sesión nuevamente para recibir su código de verificación.'
        });

    } catch (error) {
        next(error);
    }
};

/****************** RESTABLECER CONTRASEÑA ******************/

export const forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        const usuario = await Usuario.findOne({ where: { email } });

        // Por seguridad, si el usuario no existe, NO devolvemos error 404 para evitar
        // que alguien averigüe qué correos están registrados. Respondemos éxito falso.
        if (!usuario || !usuario.activo) {
            return res.status(200).json({
                message: 'Si el correo existe, recibirás un código de recuperación.'
            });
        }

        // Generar OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60000); // 10 minutos

        // Guardar OTP hasheado
        usuario.otpCode = await bcrypt.hash(otpCode, 10);
        usuario.otpExpires = otpExpires;
        await usuario.save();

        // Enviar Correo
        await emailService.sendRecoveryEmail(usuario.email, otpCode);

        res.status(200).json({
            message: 'Si el correo existe, recibirás un código de recuperación.',
            email: usuario.email
        });

    } catch (error) {
        next(error);
    }
};

// RESTABLECER CONTRASEÑA (Verifica OTP y Cambia Password)
export const resetPassword = async (req, res, next) => {
    const { email, otp, newPassword } = req.body;

    try {
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario) {
            return res.status(400).json({ message: 'Solicitud inválida.' });
        }

        // Validar OTP y Expiración
        if (!usuario.otpCode || !usuario.otpExpires || new Date() > usuario.otpExpires) {
            return res.status(400).json({ message: 'El código ha expirado o es inválido.' });
        }

        const isMatch = await bcrypt.compare(otp, usuario.otpCode);
        if (!isMatch) {
            return res.status(400).json({ message: 'Código incorrecto.' });
        }

        // ACTUALIZAR CONTRASEÑA
        // El hook 'beforeUpdate' del modelo se encargará de hashear 'newPassword'
        usuario.password = newPassword;

        // Limpiar OTP
        usuario.otpCode = null;
        usuario.otpExpires = null;

        await usuario.save();

        res.status(200).json({
            message: 'Contraseña restablecida exitosamente. Ahora puedes iniciar sesión.'
        });

    } catch (error) {
        next(error);
    }
};

/****************** VERIFICACIÓN OTP (2FA) ******************/
export const verifyOtp = async (req, res, next) => {
    const { email, otp } = req.body;

    try {
        const usuario = await Usuario.findOne({ where: { email } });

        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        // Validar si existe OTP y si no ha expirado
        if (!usuario.otpCode || !usuario.otpExpires || new Date() > usuario.otpExpires) {
            return res.status(400).json({ message: 'El código ha expirado o es inválido.' });
        }

        // Validar que el código coincida (comparando con el hash guardado)
        const isMatch = await bcrypt.compare(otp, usuario.otpCode);
        if (!isMatch) {
            return res.status(400).json({ message: 'Código incorrecto.' });
        }

        // Limpiar el OTP usado para que no se pueda reutilizar
        usuario.otpCode = null;
        usuario.otpExpires = null;
        await usuario.save();

        // Generar y enviar el Token JWT
        const token = generarJWT(usuario);

        res.status(200).json({
            status: 'success',
            message: 'Inicio de sesión exitoso.',
            token,
            usuario: {
                id: usuario.id,
                email: usuario.email,
                role: usuario.role,
                nombre: usuario.nombre,
                apellidos: usuario.apellidos
            }
        });

    } catch (error) {
        next(error);
    }
};

/**
 * 🛠️ SCRIPT DE MANTENIMIENTO TEMPORAL: 
 * Busca contraseñas en texto plano y las hashea masivamente.
 * Uso de una sola vez tras una importación masiva.
 */
export const hashearPasswordsImportados = async (req, res, next) => {
    try {
        // Traemos a todos los usuarios de la base de datos
        const usuarios = await Usuario.findAll();
        let actualizados = 0;

        for (const usuario of usuarios) {
            // ¿Cómo sabemos si está en texto plano? 
            // Los hashes de bcrypt siempre empiezan con "$2a$", "$2b$" o "$2y$" y tienen 60 caracteres.
            // Si no empieza con "$2", es seguro asumir que es un texto plano.
            if (usuario.password && !usuario.password.startsWith('$2')) {

                // 1. Hasheamos la contraseña plana manualmente
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(usuario.password, salt);

                // 2. Actualizamos la base de datos directamente
                // Usamos "update" para no disparar hooks de Sequelize y evitar un doble hasheo accidental
                await Usuario.update(
                    { password: hashedPassword },
                    { where: { id: usuario.id } }
                );

                actualizados++;
            }
        }

        res.status(200).json({
            status: 'success',
            message: `¡Mantenimiento completado! Se detectaron y encriptaron ${actualizados} contraseñas.`
        });

    } catch (error) {
        console.error("Error encriptando contraseñas:", error);
        next(error);
    }
};
