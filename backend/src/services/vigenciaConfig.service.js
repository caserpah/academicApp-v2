import { sequelize } from "../database/db.connect.js";
import { Vigencia } from "../models/vigencia.js";
import { Area } from "../models/area.js";
import { Asignatura } from "../models/asignatura.js";
import { Indicador } from "../models/indicador.js";
import { Juicio } from "../models/juicio.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

export const vigenciaConfigService = {
    /**
     * Copia configuración académica de una vigencia origen a una vigencia destino.
     *
     * opciones = {
     *   areas: boolean,
     *   asignaturas: boolean,
     *   indicadores: boolean,
     *   juicios: boolean
     * }
     */
    async copiarConfiguracion({ origenId, destinoId, opciones }) {
        try {
            const { areas, asignaturas, indicadores, juicios } = opciones || {};

            if (!areas && !asignaturas && !indicadores && !juicios) {
                const err = new Error("Debe seleccionar al menos un tipo de configuración para copiar.");
                err.status = 400;
                throw err;
            }

            if (origenId === destinoId) {
                const err = new Error("La vigencia de origen y destino deben ser diferentes.");
                err.status = 400;
                throw err;
            }

            const [vigenciaOrigen, vigenciaDestino] = await Promise.all([
                Vigencia.findByPk(origenId),
                Vigencia.findByPk(destinoId),
            ]);

            if (!vigenciaOrigen) {
                const err = new Error("No se encontró la vigencia de origen.");
                err.status = 404;
                throw err;
            }
            if (!vigenciaDestino) {
                const err = new Error("No se encontró la vigencia de destino.");
                err.status = 404;
                throw err;
            }

            // Reglas de dependencia
            if (indicadores && !asignaturas) {
                const err = new Error(
                    "No se pueden copiar los indicadores sin copiar también las asignaturas."
                );
                err.status = 400;
                throw err;
            }

            if (juicios && !indicadores) {
                const err = new Error(
                    "No se pueden copiar los juicios sin copiar también los indicadores."
                );
                err.status = 400;
                throw err;
            }

            const resultado = await sequelize.transaction(async (t) => {
                const resumen = {
                    areasCopiadas: 0,
                    areasExistentes: 0,
                    asignaturasCopiadas: 0,
                    asignaturasExistentes: 0,
                    indicadoresCopiados: 0,
                    indicadoresExistentes: 0,
                    juiciosCopiados: 0,
                    juiciosExistentes: 0,
                };

                const mapAreas = new Map();        // areaOrigenId -> areaDestinoId
                const mapAsignaturas = new Map();  // asignaturaOrigenId -> asignaturaDestinoId
                const mapIndicadores = new Map();  // indicadorOrigenId -> indicadorDestinoId

                /* ============================================================
                    1. ÁREAS
                ============================================================ */
                if (areas || asignaturas) {
                    const areasOrigen = await Area.findAll({
                        where: { vigenciaId: origenId },
                        transaction: t,
                    });

                    for (const area of areasOrigen) {
                        // Copiamos siempre el "shape" de la fila, excepto IDs y timestamps
                        const plain = area.get({ plain: true });
                        const {
                            id,
                            vigenciaId,
                            fechaCreacion,
                            fechaActualizacion,
                            createdAt,
                            updatedAt,
                            ...resto
                        } = plain;

                        // Buscar si ya existe en destino por código
                        const existente = await Area.findOne({
                            where: {
                                codigo: area.codigo,
                                vigenciaId: destinoId,
                            },
                            transaction: t,
                        });

                        if (existente) {
                            mapAreas.set(area.id, existente.id);
                            resumen.areasExistentes += 1;
                        } else if (areas) {
                            const nueva = await Area.create(
                                {
                                    ...resto,
                                    vigenciaId: destinoId,
                                },
                                { transaction: t }
                            );
                            mapAreas.set(area.id, nueva.id);
                            resumen.areasCopiadas += 1;
                        } else {
                            // No estamos copiando áreas pero sí asignaturas:
                            // Si no existe el área en destino, no podremos asignar asignaturas
                            const err = new Error(
                                `No se encontró en la vigencia destino un área con código '${area.codigo}'. ` +
                                "Copie primero las áreas o créelas manualmente antes de copiar las asignaturas."
                            );
                            err.status = 400;
                            throw err;
                        }
                    }
                }

                /* ============================================================
                    2. ASIGNATURAS
                ============================================================ */
                if (asignaturas) {
                    const asignaturasOrigen = await Asignatura.findAll({
                        where: { vigenciaId: origenId },
                        transaction: t,
                    });

                    for (const asig of asignaturasOrigen) {
                        const plain = asig.get({ plain: true });
                        const {
                            id,
                            vigenciaId,
                            fechaCreacion,
                            fechaActualizacion,
                            createdAt,
                            updatedAt,
                            ...resto
                        } = plain;

                        const areaDestinoId = mapAreas.get(asig.areaId);
                        if (!areaDestinoId) {
                            const err = new Error(
                                `No se encontró en la vigencia destino el área asociada a la asignatura '${asig.codigo}'.`
                            );
                            err.status = 400;
                            throw err;
                        }

                        // Verificar si ya existe asignatura en destino por código + vigencia
                        const existente = await Asignatura.findOne({
                            where: {
                                codigo: asig.codigo,
                                vigenciaId: destinoId,
                            },
                            transaction: t,
                        });

                        if (existente) {
                            mapAsignaturas.set(asig.id, existente.id);
                            resumen.asignaturasExistentes += 1;
                        } else {
                            const nueva = await Asignatura.create(
                                {
                                    ...resto,
                                    areaId: areaDestinoId,
                                    vigenciaId: destinoId,
                                },
                                { transaction: t }
                            );
                            mapAsignaturas.set(asig.id, nueva.id);
                            resumen.asignaturasCopiadas += 1;
                        }
                    }
                }

                /* ============================================================
                    3. INDICADORES
                ============================================================ */
                if (indicadores) {
                    const indicadoresOrigen = await Indicador.findAll({
                        where: { vigenciaId: origenId },
                        transaction: t,
                    });

                    for (const ind of indicadoresOrigen) {
                        const plain = ind.get({ plain: true });
                        const {
                            id,
                            vigenciaId,
                            fechaCreacion,
                            fechaActualizacion,
                            createdAt,
                            updatedAt,
                            ...resto
                        } = plain;

                        const asigDestinoId = mapAsignaturas.get(ind.asignaturaId);
                        if (!asigDestinoId) {
                            const err = new Error(
                                "No se encontró en la vigencia destino la asignatura asociada a uno de los indicadores. " +
                                "Asegúrese de copiar primero las asignaturas."
                            );
                            err.status = 400;
                            throw err;
                        }

                        const existente = await Indicador.findOne({
                            where: {
                                codigo: ind.codigo,
                                asignaturaId: asigDestinoId,
                                vigenciaId: destinoId,
                            },
                            transaction: t,
                        });

                        if (existente) {
                            mapIndicadores.set(ind.id, existente.id);
                            resumen.indicadoresExistentes += 1;
                        } else {
                            const nuevo = await Indicador.create(
                                {
                                    ...resto,
                                    asignaturaId: asigDestinoId,
                                    vigenciaId: destinoId,
                                },
                                { transaction: t }
                            );
                            mapIndicadores.set(ind.id, nuevo.id);
                            resumen.indicadoresCopiados += 1;
                        }
                    }
                }

                /* ============================================================
                    4. JUICIOS
                ============================================================ */
                if (juicios) {
                    const juiciosOrigen = await Juicio.findAll({
                        where: { vigenciaId: origenId },
                        transaction: t,
                    });

                    for (const juicio of juiciosOrigen) {
                        const plain = juicio.get({ plain: true });
                        const {
                            id,
                            vigenciaId,
                            fechaCreacion,
                            fechaActualizacion,
                            createdAt,
                            updatedAt,
                            ...resto
                        } = plain;

                        const indicadorDestinoId = mapIndicadores.get(juicio.indicadorId);
                        if (!indicadorDestinoId) {
                            const err = new Error(
                                "No se encontró en la vigencia destino el indicador asociado a uno de los juicios. " +
                                "Asegúrese de copiar primero los indicadores."
                            );
                            err.status = 400;
                            throw err;
                        }

                        // Evita duplicar juicios idénticos (simple heurística: misma descripción + indicador + vigencia)
                        const existente = await Juicio.findOne({
                            where: {
                                descripcion: juicio.descripcion,
                                indicadorId: indicadorDestinoId,
                                vigenciaId: destinoId,
                            },
                            transaction: t,
                        });

                        if (existente) {
                            resumen.juiciosExistentes += 1;
                        } else {
                            await Juicio.create(
                                {
                                    ...resto,
                                    indicadorId: indicadorDestinoId,
                                    vigenciaId: destinoId,
                                },
                                { transaction: t }
                            );
                            resumen.juiciosCopiados += 1;
                        }
                    }
                }

                return resumen;
            });

            return {
                vigenciaOrigen: {
                    id: origenId,
                    anio: vigenciaOrigen.anio,
                },
                vigenciaDestino: {
                    id: destinoId,
                    anio: vigenciaDestino.anio,
                },
                ...resultado,
            };

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },
};