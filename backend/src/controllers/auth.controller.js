import { Op } from "sequelize";
import { Usuario } from "../models/usuario.js";
import { Acudiente } from "../models/acudiente.js";
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

    // Validación básica de campos requeridos (aunque se debe complementar con express-validator)
    if (!identificador) {
        return res.status(400).json({ message: 'Ingrese número de documento o correo electrónico.' });
    }

    if (!password) {
        return res.status(400).json({ message: 'La contraseña es requerida.' });
    }

    try {
        // 1. Buscar usuario por email o documento (identificador)
        let usuario = await Usuario.findOne({
            where: {
                [Op.or]: [
                    { email: identificador },
                    { documento: identificador }
                ]
            }
        });

        // 2. AUTO-CREACIÓN (Just-In-Time Provisioning) para acudientes
        // que no tienen cuenta pero sí un registro en la tabla Acudiente
        if (!usuario) {
            const acudiente = await Acudiente.findOne({ where: { documento: identificador } });

            if (acudiente) {
                // Validamos que esté usando su documento como contraseña por defecto
                if (password !== acudiente.documento) {
                    return res.status(401).json({ message: 'Credenciales inválidas.' });
                }

                // Creamos el usuario en la BD al instante
                usuario = await Usuario.create({
                    nombre: acudiente.primerNombre,
                    apellidos: `${acudiente.primerApellido} ${acudiente.segundoApellido || ''}`.trim(),
                    documento: acudiente.documento,
                    email: null,
                    password: acudiente.documento, // Tu hook beforeCreate lo hasheará
                    role: 'acudiente',
                    requiereCambioPassword: true,
                    activo: true
                });

                // Enlazamos al acudiente con su nueva identidad
                acudiente.usuarioId = usuario.id;
                await acudiente.save();
            } else {
                return res.status(401).json({ message: 'Credenciales inválidas.' });
            }
        }

        if (!usuario.activo) {
            return res.status(401).json({ message: 'Usuario inactivo. Contacte a administración.' });
        }

        // 3. Comparar contraseña hasheada (aplica para docentes creados y acudientes)
        const isMatch = await usuario.validarPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 4. Verificar si el usuario requiere cambio de contraseña (Onboarding)
        if (usuario.requiereCambioPassword) {
            return res.status(200).json({
                status: 'success',
                requireOnboarding: true,
                usuarioId: usuario.id,
                message: 'Por políticas de seguridad, debe actualizar su correo y contraseña.'
            });
        }

        // 5. Lógica normal OTP (Solo llega aquí si requiereCambioPassword es false)
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // Genera un OTP de 6 dígitos
        const otpExpires = new Date(Date.now() + 5 * 60000); // Expira en 5 minutos

        // Guardar OTP y su expiración en el usuario (puede ser en la base de datos o en memoria)
        usuario.otpCode = await bcrypt.hash(otpCode, 10); // Hasheamos el OTP por seguridad
        usuario.otpExpires = otpExpires;
        await usuario.save();

        // Enviar correo. Pasamos el otpCode plano al correo, pero en está hasheado
        await emailService.sendOTP(usuario.email, otpCode);

        // Responder al Frontend (SIN TOKEN). El token se generará después de verificar el OTP
        res.status(200).json({
            status: 'success',
            message: 'Credenciales correctas. Código de verificación enviado.',
            requireOTP: true,
            email: usuario.email
        });

    } catch (error) {
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

        // Si es acudiente, le sincronizamos el correo a su perfil original
        if (usuario.role === 'acudiente') {
            await Acudiente.update({ email: email }, { where: { usuarioId: usuario.id } });
        }

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