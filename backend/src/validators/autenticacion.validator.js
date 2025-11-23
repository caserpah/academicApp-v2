import { body } from 'express-validator';
// Importamos el manejador de errores de validación
import { validationErrorHandler } from './validationErrorHandler.js';

// --- Reglas de Validación para el Registro ---
export const validarRegistro = [
    // Validación de Datos de Identificación
    body('nombreCompleto')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('El nombre completo debe tener entre 3 y 100 caracteres.')
        .escape(),

    body('numeroDocumento')
        .trim()
        .isLength({ min: 5, max: 20 }).withMessage('El número de documento debe tener entre 5 y 20 caracteres.')
        .isAlphanumeric('es-ES', { ignore: ' ' }).withMessage('El número de documento solo puede contener caracteres alfanuméricos.'),

    body('contacto')
        .optional({ nullable: true, checkFalsy: true }) // Es opcional
        .isMobilePhone('es-CO').withMessage('El número de contacto debe ser un formato de teléfono colombiano válido.'),

    // Validación de Credenciales
    body('email')
        .trim()
        .isEmail().withMessage('El formato del correo electrónico es inválido.')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contraseña debe incluir mayúsculas, minúsculas y números.'),

    // Validación de Rol (Opcional, pero segura)
    body('role')
        .optional({ nullable: true, checkFalsy: true })
        .isIn(['admin', 'director', 'coordinador', 'docente', 'acudiente']).withMessage('Rol inválido. Roles permitidos: admin, director, coordinador, profesor, acudiente.'),

    // 3. LLAMADA AL MANEJADOR: Si hay errores de validación, se pasan al manejador.
    validationErrorHandler
];


// --- Reglas de Validación para el Login ---
export const validarLogin = [
    body('email')
        .trim()
        .isEmail().withMessage('Debe proporcionar un correo electrónico válido.'),

    body('password')
        .isLength({ min: 1 }).withMessage('La contraseña es requerida.'),

    // LLAMADA AL MANEJADOR
    validationErrorHandler
];