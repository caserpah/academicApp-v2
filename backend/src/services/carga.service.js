import { cargaRepository } from "../repositories/carga.repository.js";
import { asignaturaRepository } from "../repositories/asignatura.repository.js";
import { docenteRepository } from "../repositories/docente.repository.js";
import { Vigencia } from "../models/vigencia.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { sequelize } from "../database/db.connect.js";

export const cargaService = {
    async list(params) {
        const filtros = { ...params };

        // Si no se especifica vigencia, usar la ACTIVA por defecto.
        if (!filtros.vigenciaId) {
            const vigenciaActiva = await Vigencia.findOne({ where: { activa: true } });
            if (vigenciaActiva) {
                filtros.vigenciaId = vigenciaActiva.id;
            }
        }

        return await cargaRepository.findAll(filtros);
    },

    async get(id) {
        const registro = await cargaRepository.findById(id);
        if (!registro) {
            const err = new Error("No se encontró la carga académica solicitada.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    async create(data) {
        const t = await sequelize.transaction();
        try {
            const payload = { ...data };

            // Asignar Vigencia Activa si no viene en el payload
            if (!payload.vigenciaId) {
                const vigenciaActiva = await Vigencia.findOne({ where: { activa: true }, transaction: t });
                if (!vigenciaActiva) throw new Error("No hay una vigencia o año lectivo activo configurado en el sistema.");
                payload.vigenciaId = vigenciaActiva.id;
            }

            // Generar Código Automatico
            // Formato: C-{vigencia}-{timestamp-corto}-{random}
            // Ej: C2025-X7Z9-123
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const timestamp = Date.now().toString(36).toUpperCase().substring(4);
            payload.codigo = `C${payload.vigenciaId}-${timestamp}${randomSuffix}`;

            // Validar reglas de negocio antes de crear
            const datosValidados = await this._aplicarReglasDeNegocio(payload, t);

            const nuevaCarga = await cargaRepository.create(datosValidados, t);

            await t.commit();

            // Retornamos con relaciones
            return {
                message: "Carga académica creada exitosamente.",
                data: await cargaRepository.findById(nuevaCarga.id)
            };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    async update(id, data) {
        const t = await sequelize.transaction();
        try {
            // No permitimos actualizar vigencia o código fácilmente para mantener integridad
            // pero aplicamos reglas por si cambian docente/asignatura
            const datosValidados = await this._aplicarReglasDeNegocio(data, t);

            const actualizado = await cargaRepository.updateById(id, datosValidados, t);

            if (!actualizado) throw new Error("Carga académica no encontrada.");

            await t.commit();

            return {
                message: "Carga académica actualizada exitosamente.",
                data: await cargaRepository.findById(id)
            };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    async remove(id) {
        const t = await sequelize.transaction();
        try {
            const deleted = await cargaRepository.deleteById(id, t);
            if (!deleted) throw new Error("No se encontró la carga para eliminar.");

            await t.commit();
            return { message: "Carga eliminada exitosamente." };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * MÉTODO PRIVADO: Reglas de Negocio Centralizadas
     */
    async _aplicarReglasDeNegocio(data) {
        const payload = { ...data };

        // REGLA 1: Docente Activo
        if (payload.docenteId) {
            const docente = await docenteRepository.findById(payload.docenteId);
            if (!docente) throw new Error("El docente seleccionado no existe.");
            if (!docente.activo) {
                const err = new Error("No se puede asignar carga a un docente INACTIVO.");
                err.status = 422;
                throw err;
            }
        }

        // REGLA 2: Asignatura 'COMPORTAMIENTO' = 0 Horas
        if (payload.asignaturaId) {
            const asignatura = await asignaturaRepository.findById(payload.asignaturaId);
            if (!asignatura) throw new Error("La asignatura seleccionada no existe.");

            const nombreAsig = asignatura.nombre.toUpperCase();

            // Verificamos si es Comportamiento
            if (nombreAsig.includes("COMPORTAMIENTO")) {
                payload.horas = 0; // Forzamos 0 horas
            } else {
                // Si NO es comportamiento, validamos que las horas sean positivas
                if (!payload.horas || payload.horas <= 0) {
                    throw new Error(`La asignatura ${asignatura.nombre} requiere una intensidad horaria mayor a 0.`);
                }
            }
        }
        return payload;
    }
};