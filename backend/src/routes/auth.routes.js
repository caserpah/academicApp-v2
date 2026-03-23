import { Router } from 'express';

// Importamos las funciones del controlador de autenticación
import {
    register,
    login,
    verifyOtp,
    forgotPassword,
    resetPassword,
    completarOnboarding
} from '../controllers/auth.controller.js';

// Importamos las funciones de validación
import {
    validarRegistro,
    validarLogin,
    validarOTP,
    validarForgotPassword,
    validarResetPassword,
    validarOnboarding
} from '../validators/auth.validator.js';

const router = Router();

// Ruta para crear un nuevo usuario con validación
router.post('/registro', validarRegistro, register);

// Ruta para iniciar sesión (Generar OTP)
router.post('/login', validarLogin, login);

// Ruta para verificar el OTP y generar el token JWT
router.post('/verify-otp', validarOTP, verifyOtp);

// Ruta para solicitar restablecimiento de contraseña (Generar OTP)
router.post('/forgot-password', validarForgotPassword, forgotPassword);

// Ruta para restablecer la contraseña (Verificar OTP y Cambiar Password)
router.post('/reset-password', validarResetPassword, resetPassword);

// Ruta para completar el onboarding (establecer nueva contraseña en el primer acceso)
router.post('/onboarding', validarOnboarding, completarOnboarding);

export default router;