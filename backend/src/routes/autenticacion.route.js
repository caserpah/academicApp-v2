import { Router } from 'express';

// Importamos las funciones del controlador de autenticación
import {
    register,
    login
} from '../controllers/autenticacion.controller.js';

// Importamos las funciones de validación
import {
    validarRegistro,
    validarLogin
} from '../validators/autenticacion.validator.js';

const router = Router();

// Ruta para crear un nuevo usuario con validación
router.post('/registro', validarRegistro, register);

// Ruta para iniciar sesión y obtener el token JWT con validación
router.post('/login', validarLogin, login);

export default router;