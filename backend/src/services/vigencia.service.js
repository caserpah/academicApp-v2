import { sequelize } from "../database/db.connect.js";
import { vigenciaRepository } from "../repositories/vigencia.repository.js";
import { areaRepository } from "../repositories/area.repository.js";
import { asignaturaRepository } from "../repositories/asignatura.repository.js";
import { grupoRepository } from "../repositories/grupo.repository.js";
import { desempenoRangoRepository } from "../repositories/desempenoRango.repository.js";
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

    /**
     * Clona configuraciones de una vigencia origen a una vigencia destino.
     */
    async clonarConfiguracion(destinoId, payload) {
        const { vigenciaOrigenId, opciones } = payload;

        if (Number(destinoId) === Number(vigenciaOrigenId)) {
            const err = new Error("El año lectivo de origen y destino no pueden ser el mismo.");
            err.status = 400;
            throw err;
        }

        const vigenciaDestino = await vigenciaRepository.findById(destinoId);
        const vigenciaOrigen = await vigenciaRepository.findById(vigenciaOrigenId);

        if (!vigenciaDestino || !vigenciaOrigen) {
            const err = new Error("No se encontró el año lectivo de origen o destino especificado.");
            err.status = 404;
            throw err;
        }

        const t = await sequelize.transaction();

        try {
            // Clonar Rangos de desempeño
            if (opciones.desempenos) {
                const count = await desempenoRangoRepository.countByVigencia(destinoId, { transaction: t });
                if (count > 0) throw new Error("El año lectivo de destino ya tiene rangos de desempeño configurados.");

                const rangosOrigen = await desempenoRangoRepository.findAllRawByVigencia(vigenciaOrigenId, { transaction: t });

                if (rangosOrigen.length > 0) {
                    const nuevosRangos = rangosOrigen.map(item => ({
                        vigenciaId: destinoId,
                        desempenoId: item.desempenoId,
                        minNota: item.minNota,
                        maxNota: item.maxNota,
                        activo: item.activo
                    }));
                    await desempenoRangoRepository.bulkCreate(nuevosRangos, { transaction: t });
                }
            }

            // Clonar Áreas (almacenando el mapeo de IDs para las asignaturas)
            let mapaAreas = {};
            if (opciones.areas) {
                const countAreas = await areaRepository.countByVigencia(destinoId, { transaction: t });
                if (countAreas > 0) throw new Error("El año lectivo de destino ya tiene áreas configuradas.");

                const areasOrigen = await areaRepository.findAllRawByVigencia(vigenciaOrigenId, { transaction: t });

                for (const item of areasOrigen) {
                    const nuevaArea = await areaRepository.create({
                        vigenciaId: destinoId,
                        codigo: item.codigo,
                        nombre: item.nombre,
                        abreviatura: item.abreviatura,
                        promociona: item.promociona
                    }, { transaction: t });

                    mapaAreas[item.id] = nuevaArea.id;
                }
            }

            // Clonar Asignaturas
            if (opciones.asignaturas) {
                const countAsig = await asignaturaRepository.countByVigencia(destinoId, { transaction: t });
                if (countAsig > 0) throw new Error("El año lectivo de destino ya tiene asignaturas configuradas.");

                if (!opciones.areas) {
                    throw new Error("Para clonar las asignaturas, debe seleccionar también la clonación de áreas.");
                }

                const asignaturasOrigen = await asignaturaRepository.findAllRawByVigencia(vigenciaOrigenId, { transaction: t });

                if (asignaturasOrigen.length > 0) {
                    const nuevasAsignaturas = asignaturasOrigen.map(item => {
                        if (!mapaAreas[item.areaId]) {
                            throw new Error(`Inconsistencia relacional: No se encontró el área asociada a la asignatura ${item.nombre}.`);
                        }

                        return {
                            vigenciaId: destinoId,
                            areaId: mapaAreas[item.areaId],
                            codigo: item.codigo,
                            nombre: item.nombre,
                            nombreCorto: item.nombreCorto,
                            abreviatura: item.abreviatura,
                            porcentual: item.porcentual
                        };
                    });
                    await asignaturaRepository.bulkCreate(nuevasAsignaturas, { transaction: t });
                }
            }

            // Clonar Grupos
            if (opciones.grupos) {
                const countGrupos = await grupoRepository.countByVigencia(destinoId, { transaction: t });
                if (countGrupos > 0) throw new Error("El año lectivo de destino ya tiene grupos configurados.");

                const gruposOrigen = await grupoRepository.findAllRawByVigencia(vigenciaOrigenId, { transaction: t });

                if (gruposOrigen.length > 0) {
                    const nuevosGrupos = gruposOrigen.map(item => ({
                        vigenciaId: destinoId,
                        nombre: item.nombre,
                        gradoId: item.gradoId,
                        jornada: item.jornada,
                        cupos: item.cupos,
                        sobrecupoPermitido: item.sobrecupoPermitido,
                        sedeId: item.sedeId
                    }));
                    await grupoRepository.bulkCreate(nuevosGrupos, { transaction: t });
                }
            }

            await t.commit();
            return { message: "Configuración clonada exitosamente." };

        } catch (error) {
            await t.rollback();
            if (error.status) throw error;

            const err = new Error(error.message || "Error interno al intentar clonar la configuración.");
            err.status = error.message.includes("ya tiene") || error.message.includes("debe seleccionar") ? 400 : 500;
            throw err;
        }
    }
};