import { asignaturaRepository } from "../repositories/asignatura.repository.js";
import { areaRepository } from "../repositories/area.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

/**
 * Service: Asignatura
 * Encapsula la lógica de negocio para las asignaturas.
 */
export const asignaturaService = {

    /**
     * Listado con filtros, paginación y ordenamiento.
     */
    async list(params, vigenciaId) {
        try {
            const page = Number(params.page) || 1;
            const limit = Number(params.limit) || 10;
            // Mapeamos params para el repositorio
            return await asignaturaRepository.findAll({
                ...params,
                page,
                limit,
                search: params.nombre || params.search, // Soporte para 'nombre' como alias de 'search'
                vigenciaId,
                includeArea: true,
                includeVigencia: true,
            });
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Obtener detalle de un asignatura.
     */
    async get(id, vigenciaId) {
        try {
            const asignatura = await asignaturaRepository.findById(id, {
                includeVigencia: true,
            });

            if (!asignatura || asignatura.vigenciaId !== vigenciaId) {
                const err = new Error("No se encontró la asignatura solicitada.");
                err.status = 404;
                throw err;
            }

            return asignatura;

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Crear nueva asignatura (usa la vigencia activa).
     */
    async create(data, vigenciaId) {
        try {
            const {
                codigo,
                nombre,
                nombreCorto,
                abreviatura,
                promociona,
                porcentual,
                areaId,
            } = data;

            // Validar área
            const area = await areaRepository.findById(data.areaId);
            if (!area || area.vigenciaId !== vigenciaId) {
                const err = new Error("El área seleccionada no pertenece al año lectivo actual.");
                err.status = 400;
                throw err;
            }

            // Validar porcentual (0–100)
            if (data.porcentual < 0 || data.porcentual > 100) {
                const err = new Error("El porcentaje debe estar entre 0 y 100.");
                err.status = 400;
                throw err;
            }

            // Validar porcentaje total del área
            /*await validarPorcentualArea({
                areaId: data.areaId,
                vigenciaId,
                porcentual: data.porcentual
            });*/

            const asignatura = await asignaturaRepository.create({
                codigo,
                nombre,
                nombreCorto,
                abreviatura,
                promociona,
                porcentual,
                areaId,
                vigenciaId,
            });

            return await asignaturaRepository.findById(asignatura.id);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar área existente.
     */
    async update(id, data, vigenciaId) {
        try {
            const asignatura = await asignaturaRepository.findById(id);

            if (!asignatura || asignatura.vigenciaId !== vigenciaId) {
                const err = new Error("No se encontró la asignatura solicitada.");
                err.status = 404;
                throw err;
            }

            const {
                codigo,
                nombre,
                nombreCorto,
                abreviatura,
                promociona,
                porcentual,
                areaId,
            } = data;

            // Validar área si viene en el payload
            if (areaId) {
                const area = await areaRepository.findById(areaId);

                if (!area || area.vigenciaId !== vigenciaId) {
                    const err = new Error("El área seleccionada no pertenece al año lectivo actual.");
                    err.status = 400;
                    throw err;
                }
            }

            // Validar porcentual (0–100)
            if (porcentual !== undefined && (porcentual < 0 || porcentual > 100)) {
                const err = new Error("El porcentaje debe estar entre 0 y 100.");
                err.status = 400;
                throw err;
            }

            // Determinar el área final (puede ser cambiada)
            const areaFinalId = data.areaId ?? asignatura.areaId;

            // Determinar el porcentual final
            const porcentualFinal =
                data.porcentual !== undefined ? data.porcentual : asignatura.porcentual;

            // Validar porcentaje acumulado en esa área
            /*await validarPorcentualArea({
                areaId: areaFinalId,
                vigenciaId,
                porcentual: porcentualFinal,
                excluirAsignaturaId: asignatura.id
            });*/

            await asignatura.update({
                codigo,
                nombre,
                nombreCorto,
                abreviatura,
                promociona,
                porcentual,
                areaId,
            });

            return await asignaturaRepository.findById(id);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar asignatura.
     */
    async remove(id, vigenciaId) {
        try {
            const asignatura = await asignaturaRepository.findById(id);

            if (!asignatura || asignatura.vigenciaId !== vigenciaId) {
                const err = new Error("No se encontró la asignatura solicitada.");
                err.status = 404;
                throw err;
            }

            await asignaturaRepository.deleteById(id);
            return { message: "La asignatura fue eliminada exitosamente." };

        } catch (error) {
            const errTransformado = formatearErrorForaneo(
                error,
                "esta asignatura",
                "cargas o juicios asociados"
            );
            throw handleSequelizeError(errTransformado);
        }
    },
};