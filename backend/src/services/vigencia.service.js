import { vigenciaRepository } from "../repositories/vigencia.repository.js";
import { setVigenciaActiva } from "../utils/vigencia.helper.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

/**
 * Service: Vigencia
 * -----------------
 * - Lógica de negocio para las vigencias académicas.
 * - Controla creación, actualización, activación y eliminación.
 * - Usa formatearErrorForaneo() para mensajes claros en FK errors.
 */
export const vigenciaService = {
    /**
     * Listado con paginación y filtros opcionales.
     * @param {object} params - query params (page, limit, estado, activa, anio, orderBy, order)
     * @param {boolean} isAdmin - controla visibilidad de 'observaciones'
     */
    async list(params, isAdmin = false) {
        const attributes = isAdmin ? undefined : { exclude: ["fechaCreacion", "fechaActualizacion"] };
        return vigenciaRepository.findAll({ ...params, attributes });
    },

    /**
     * Detalle por ID.
     */
    async get(id, isAdmin = false) {
        const attributes = isAdmin ? undefined : { exclude: ["fechaCreacion", "fechaActualizacion"] };
        const registro = await vigenciaRepository.findById(id, { attributes });

        if (!registro) {
            const err = new Error("No se encontró el año lectivo solicitado.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    /**
     * Crear vigencia.
     * - Si viene activa=true, se activa explícitamente (desactiva las demás).
     */
    async create(data) {
        const { activa, ...rest } = data;
        const nueva = await vigenciaRepository.create({ ...rest, activa: !!activa });

        if (activa) {
            await setVigenciaActiva(nueva.id);
        }
        return vigenciaRepository.findById(nueva.id);
    },

    /**
     * Actualizar vigencia.
     */
    async update(id, data) {
        const actual = await vigenciaRepository.findById(id);

        if (!actual) {
            const err = new Error("No se encontró la vigencia solicitada.");
            err.status = 404;
            throw err;
        }

        const {
            anio,
            fechaInicio,
            fechaFin,
            estado,
            activa,
            observaciones
        } = data;

        const payload = {
            anio,
            fechaInicio,
            fechaFin,
            estado,
            activa,
            observaciones
        };

        await actual.update(payload);
        return actual;
    },

    /**
     * Eliminar vigencia.
     * - Bloquea eliminar la vigente activa.
     */
    async remove(id) {
        try {
            const registro = await vigenciaRepository.findById(id);

            if (!registro) {
                const err = new Error("No se encontró el año lectivo solicitado.");
                err.status = 404;
                throw err;
            }
            if (registro.activa) {
                const err = new Error("No se puede eliminar un año lectivo que esté abierto actualmente.");
                err.status = 409;
                throw err;
            }

            await vigenciaRepository.deleteById(id);
            return true;
        } catch (error) {
            // Captura cualquier ForeignKeyConstraintError y devuelve un mensaje claro
            throw formatearErrorForaneo(error, "este año lectivo", "grupos o matrículas");
        }
    },

    async abrir(id) {
        const vigente = await setVigenciaActiva(id);
        return vigente;
    },

    async cerrar(id) {
        const registro = await vigenciaRepository.findById(id);
        if (!registro) {
            const err = new Error("No se encontró el año lectivo solicitado.");
            err.status = 404;
            throw err;
        }
        await registro.update({ activa: false });
        return registro;
    },
};