
import { vigenciaService } from "../services/vigencia.service.js";
import { sendSuccess } from "../middleware/responseHandler.js";

/**
 * Controller: Vigencia
 * --------------------
 * Controla la gestión de años lectivos del sistema académico.
 * Solo los administradores pueden crear, editar, eliminar o activar una vigencia.
 */
export const vigenciaController = {
    /**
     * Obtener lista de vigencias (paginada, sin filtro global).
     */
    async list(req, res, next) {
        try {
            const isAdmin = req.usuario?.role === "admin";
            const data = await vigenciaService.list(req.query, isAdmin);
            return sendSuccess(res, data, "Listado de años lectivos disponibles.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Obtener detalle de una vigencia específica.
     */
    async get(req, res, next) {
        try {
            const { id } = req.params;
            const isAdmin = req.usuario?.role === "admin";
            const data = await vigenciaService.get(id, isAdmin, req.query.anio);
            return sendSuccess(res, data, "Detalles del año solicitado.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Crear una nueva vigencia.
     * Solo para administradores.
     */
    async create(req, res, next) {
        try {
            const data = await vigenciaService.create(req.body);
            return sendSuccess(res, data, "Año lectivo creado exitosamente.", 201);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Actualizar una vigencia existente.
     */
    async update(req, res, next) {
        try {
            const id = req.params.id;
            const anio = req.body?.anio || null;

            const data = await vigenciaService.update(id, req.body, anio);
            return sendSuccess(res, data, "Año lectivo actualizado exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Eliminar una vigencia (solo si no está activa).
     */
    async remove(req, res, next) {
        try {
            const { id } = req.params;
            const anio = req.query?.anio || null;
            await vigenciaService.remove(id, anio);
            return sendSuccess(res, null, "Año lectivo eliminado exitosamente.", 200);
        } catch (error) {
            next(error);
        }
    },

    /**
     * Abrir explícitamente una vigencia.
     * Cerrar las demás. Solo administrador.
     */
    async abrir(req, res, next) {
        try {
            const { id } = req.params;
            const data = await vigenciaService.abrir(id);
            return sendSuccess(res, data, "El Año lectivo fue abierto exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * Cerra una vigencia. Solo administrador.
     */
    async cerrar(req, res, next) {
        try {
            const { id } = req.params;
            const data = await vigenciaService.cerrar(Number(id));
            return sendSuccess(res, data, "El año lectivo fue cerrado exitosamente.");
        } catch (error) {
            next(error);
        }
    },
};