import { coordinadorRepository } from "../repositories/coordinador.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { sequelize } from "../database/db.connect.js";
import e from "express";

export const coordinadorService = {
    async list(params) {
        return await coordinadorRepository.findAll(params);
    },

    async get(id) {
        const registro = await coordinadorRepository.findById(id);
        if (!registro) {
            const err = new Error("No se encontró el coordinador solicitado.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    async create(data) {
        const t = await sequelize.transaction();
        try {
            const { documento, nombre, email, telefono, direccion, asignaciones } = data;

            // Crear Coordinador
            const nuevoCoordinador = await coordinadorRepository.create({
                documento, nombre, email, telefono, direccion
            }, t);

            // Procesar Asignaciones
            if (asignaciones && Array.isArray(asignaciones)) {
                await this._procesarAsignaciones(nuevoCoordinador.id, asignaciones, t);
            }

            await t.commit();

            // Obtener el registro actualizado
            const completo = await coordinadorRepository.findById(nuevoCoordinador.id);

            return { message: "Coordinador registrado exitosamente.", data: completo };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    async update(id, data) {
        const t = await sequelize.transaction();
        try {
            const { documento, nombre, email, telefono, direccion, asignaciones } = data;

            await coordinadorRepository.updateById(id, {
                documento, nombre, email, telefono, direccion
            }, t);

            if (asignaciones && Array.isArray(asignaciones)) {
                await coordinadorRepository.deleteAsignacionesPorCoordinador(id, t);
                await this._procesarAsignaciones(id, asignaciones, t);
            }

            await t.commit();

            // Obtener el registro actualizado
            const actualizado = await coordinadorRepository.findById(id);
            return { message: "Coordinador actualizado correctamente.", data: actualizado };

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    async remove(id) {
        // Nota: Por restricción de FK, primero se deberían borrar asignaciones o usar cascade en DB.
        // Aquí asumimos que sequelize maneja el error si hay hijos, o implementamos borrado en cascada manual.
        try {
            const t = await sequelize.transaction();
            try {
                await coordinadorRepository.deleteAsignacionesPorCoordinador(id, t);
                await coordinadorRepository.deleteById(id, t); // Pasa transaction si repository lo soporta
                await t.commit();
                return { message: "Coordinador eliminado exitosamente." };
            } catch (e) {
                await t.rollback();
                throw e;
            }
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    // Helper para validar y crear asignaciones
    async _procesarAsignaciones(coordinadorId, asignaciones, transaction) {
        for (const asig of asignaciones) {
            // Si es Convivencia, la jornada es obligatoria
            if (asig.tipo === 'CONVIVENCIA' && !asig.jornada) {
                throw new Error(`La asignación de Coordinación de Convivencia para la sede requiere especificar una Jornada.`);
            }

            // Regla: Verificar disponibilidad (Slot único)
            // Nota: Se ignora si el slot lo ocupa EL MISMO coordinador (en caso de updates complejos),
            // pero como borramos todo antes en update, esta validación funciona bien para "robos de puesto".
            const ocupado = await coordinadorRepository.findAsignacionConflictiva(asig, transaction);

            if (ocupado && ocupado.coordinadorId !== coordinadorId) {

                // Determinar rol para el mensaje
                let rolCoordinador = '';
                if (asig.tipo === 'CONVIVENCIA') {
                    rolCoordinador = 'de Convivencia';
                } else if (asig.tipo === 'ACADEMICO') {
                    rolCoordinador = 'Académico';
                }

                throw new Error(`La sede ya tiene asignado un Coordinador ${rolCoordinador} para el año lectivo seleccionado.`);
            }

            // Crear
            await coordinadorRepository.createAsignacion({
                coordinadorId,
                sedeId: asig.sedeId,
                vigenciaId: asig.vigenciaId,
                tipo: asig.tipo,
                jornada: asig.tipo === 'CONVIVENCIA' ? asig.jornada : null
            }, transaction);
        }
    }
};