import { Op } from "sequelize";
import { ventanaCalificacionRepository } from "../repositories/ventanaCalificacion.repository.js";
import { Vigencia } from "../models/vigencia.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { sequelize } from "../database/db.connect.js";

export const ventanaCalificacionService = {
    async list(params) {
        const filtros = { ...params };

        // Priorizar la vigencia activa si no se filtra por una específica
        if (!filtros.vigenciaId) {
            const vigenciaActiva = await Vigencia.findOne({ where: { activa: true } });
            if (vigenciaActiva) filtros.vigenciaId = vigenciaActiva.id;
        }

        return await ventanaCalificacionRepository.findAll(filtros);
    },

    async get(id) {
        const registro = await ventanaCalificacionRepository.findById(id);
        if (!registro) {
            const err = new Error("La ventana de calificación no existe.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    async create(data) {
        const t = await sequelize.transaction();
        try {
            const payload = { ...data };

            // Asignar vigencia activa por defecto
            if (!payload.vigenciaId) {
                const vigenciaActiva = await Vigencia.findOne({ where: { activa: true }, transaction: t });
                if (!vigenciaActiva) throw new Error("No hay un año lectivo activo configurado.");
                payload.vigenciaId = vigenciaActiva.id;
            }

            // Aplicar reglas de validación de fechas y periodos
            await this._validarLogicaVentana(payload, t);

            const nuevaVentana = await ventanaCalificacionRepository.create(payload, t);
            await t.commit();

            return {
                message: "Ventana de calificación creada exitosamente.",
                data: await ventanaCalificacionRepository.findById(nuevaVentana.id)
            };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    async update(id, data) {
        const t = await sequelize.transaction();
        try {
            // Validar existencia
            const existente = await ventanaCalificacionRepository.findById(id);
            if (!existente) throw new Error("Ventana de calificaciones no encontrada.");

            // Mezclar datos para validar el objeto completo resultante
            const dataValidar = { ...existente.toJSON(), ...data };
            await this._validarLogicaVentana(dataValidar, t, id);

            const actualizado = await ventanaCalificacionRepository.updateById(id, data, t);
            if (!actualizado) throw new Error("No se pudo actualizar la ventana de calificaciones.");

            await t.commit();

            return {
                message: "Ventana de calificaciones actualizada exitosamente.",
                data: await ventanaCalificacionRepository.findById(id)
            };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    async remove(id) {
        const t = await sequelize.transaction();
        try {
            const deleted = await ventanaCalificacionRepository.deleteById(id, t);
            if (!deleted) throw new Error("No se pudo eliminar la ventana de calificaciones.");
            await t.commit();
            return { message: "Ventana de calificaciones eliminada con éxito." };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * MÉTODO PRIVADO: Reglas de Negocio
     */
    async _validarLogicaVentana(data, transaction, excludeId = null) {
        const { fechaInicio, fechaFin, periodo, vigenciaId } = data;

        if (new Date(fechaInicio) > new Date(fechaFin)) {
            throw new Error("La fecha de inicio no puede ser posterior a la fecha de cierre.");
        }

        const queryOverlap = { periodo, vigenciaId };
        if (excludeId) {
            queryOverlap.id = { [Op.ne]: excludeId };
        }

        const duplicado = await sequelize.models.ventana_calificacion.findOne({
            where: queryOverlap,
            transaction
        });

        if (duplicado) {
            throw new Error(`Ya existe una ventana de calificaciones configurada para el periodo ${periodo} en este año lectivo.`);
        }
    }
};