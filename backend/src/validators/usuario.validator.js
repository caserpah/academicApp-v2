import { body, param } from 'express-validator';
import { validationErrorHandler } from './validationErrorHandler.js';

// --- Validar Creación de Usuario (Desde Admin) ---
export const validarCrearUsuario = [
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
        .notEmpty().withMessage('El documento es obligatorio.'),

    body('email')
        .trim()
        .isEmail().withMessage('Email inválido.'),

    body('telefono')
        .optional({ nullable: true, checkFalsy: true })
        .isMobilePhone('es-CO').withMessage('El número de teléfono debe ser válido.'),

    // En creación administrativa, el password podría ser opcional si el sistema genera uno aleatorio.
    body('password')
        .optional({ nullable: true, checkFalsy: true }) // Lo hacemos opcional seguromente, ya que el admin podría no querer establecerlo y dejar que el sistema lo genere.
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

    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Ingrese el nombre.'),

    body('apellidos')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 }).withMessage('Ingrese el apellido.'),

    body('documento')
        .optional()
        .trim()
        .isLength({ min: 5, max: 20 }).withMessage('Ingrese el documento.'),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Email inválido.'),

    body('telefono')
        .optional({ nullable: true, checkFalsy: true })
        .isMobilePhone('es-CO').withMessage('El número de teléfono debe ser válido.'),

    // Password opcional: solo si el admin quiere resetearla
    body('password')
        .optional({ checkFalsy: true }) // Si viene vacío, lo ignora
        .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres.'),

    body('role')
        .optional()
        .isIn(['admin', 'director', 'coordinador', 'docente', 'acudiente']),

    validationErrorHandler
];