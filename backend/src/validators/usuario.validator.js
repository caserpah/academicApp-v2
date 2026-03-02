import { body, param } from 'express-validator';
import { validationErrorHandler } from './validationErrorHandler.js';

// --- Validar Creación de Usuario (Desde Admin) ---
export const validarCrearUsuario = [
    body('nombreCompleto')
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('El nombre es obligatorio.')
        .escape(),

    body('documento')
        .trim()
        .notEmpty().withMessage('El documento es obligatorio.'),

    body('email')
        .trim()
        .isEmail().withMessage('Email inválido.'),

    // En creación administrativa, el password podría ser opcional si el sistema genera uno aleatorio.
    body('password')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres.'),

    body('role')
        .isIn(['admin', 'director', 'coordinador', 'docente', 'acudiente'])
        .withMessage('Rol no válido.'),

    validationErrorHandler
];

// --- Validar Actualización de Usuario (PUT) ---
export const validarActualizarUsuario = [
    // Validar que el ID venga en la URL
    param('id').isInt().withMessage('Usuario inválido'),

    body('nombreCompleto')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Nombre inválido.'),

    body('documento')
        .optional()
        .trim()
        .isLength({ min: 5, max: 20 }),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Email inválido.'),

    // Password opcional: solo si el admin quiere resetearla
    body('password')
        .optional({ checkFalsy: true }) // Si viene vacío, lo ignora
        .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres.'),

    body('role')
        .optional()
        .isIn(['admin', 'director', 'coordinador', 'docente', 'acudiente']),

    validationErrorHandler
];