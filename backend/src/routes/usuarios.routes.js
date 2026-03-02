import { Router } from 'express';

// Importamos el nuevo controlador de gestión
import { usuarioController } from '../controllers/usuario.controller.js';

import { validarCrearUsuario, validarActualizarUsuario } from '../validators/usuario.validator.js';

// Importamos middlewares de seguridad
import { protect, restrictTo } from '../middleware/auth.middleware.js';

const router = Router();

// === RUTAS PROTEGIDAS (Requieren Token) ===

// Proteger todas las rutas de este archivo
router.use(protect);

// Rutas específicas
// GET /api/usuarios -> Listar (Solo admin, director, coordinador)
router.get('/', restrictTo(['admin', 'director', 'coordinador']), usuarioController.list);

// PUT /api/usuarios/:id -> Actualizar (Solo admin)
router.put('/:id', restrictTo(['admin']), validarActualizarUsuario, usuarioController.update);

// DELETE /api/usuarios/:id -> Eliminar (Solo admin)
router.delete('/:id', restrictTo(['admin']), usuarioController.remove);

export default router;