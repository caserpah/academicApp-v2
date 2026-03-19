import { body } from 'express-validator';
import { validationErrorHandler } from './validationErrorHandler.js';

// --- Validar Registro (Público) ---
export const validarRegistro = [
    // Validación de Datos de Identificación
    body('nombre')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Ingrese el nombre.')
        .escape(),

    body('apellidos')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Ingrese el apellido.')
        .escape(),

    body('documento')
        .trim()
        .isLength({ min: 5, max: 20 }).withMessage('El número de documento debe tener entre 5 y 20 caracteres.')
        .isAlphanumeric('es-ES', { ignore: ' ' }),

    body('telefono')
        .optional({ nullable: true, checkFalsy: true }) // Es opcional
        .isMobilePhone('es-CO').withMessage('El número de teléfono debe ser un formato de teléfono válido.'),

    // Validación de Credenciales
    body('email')
        .trim()
        .isEmail().withMessage('El formato del correo electrónico es inválido.')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contraseña debe incluir mayúsculas, minúsculas y números.'),

    validationErrorHandler
];


// --- Reglas de Validación para el Login ---
export const validarLogin = [
    body('email')
        .trim()
        .isEmail().withMessage('Debe proporcionar un correo electrónico válido.'),

    body('password')
        .notEmpty().withMessage('La contraseña es requerida.'),

    validationErrorHandler
];

// --- Validar OTP (Paso 2) ---
export const validarOTP = [
    body('email')
        .trim()
        .isEmail().withMessage('Email inválido.'),

    body('otp')
        .trim()
        .isLength({ min: 6, max: 6 }).withMessage('El código debe ser de 6 dígitos.')
        .isNumeric().withMessage('El código solo contiene números.'),

    validationErrorHandler
];

// Validar solicitud de correo
export const validarForgotPassword = [
    body('email').trim().isEmail().withMessage('Email inválido.'),
    validationErrorHandler
];

// Validar cambio de contraseña
export const validarResetPassword = [
    body('email').trim().isEmail(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
    body('newPassword')
        .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Debe incluir mayúsculas, minúsculas y números.'),
    validationErrorHandler
];