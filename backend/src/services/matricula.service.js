import { sequelize } from "../database/db.connect.js";
import { matriculaRepository } from "../repositories/matricula.repository.js";
import { HistorialMatriculas } from "../models/historial_matriculas.js";
import { Grupo } from "../models/grupo.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

/**
 * Genera un código de folio único.
 * Formato: MAT-[AÑO]-[ALFANUMERICO_6]
 * Ej: MAT-2025-A7X92Z
 */
const generarFolio = (anioVigencia) => {
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MAT-${anioVigencia}-${randomStr}`;
};

export const matriculaService = {

    /**
     * Obtiene el listado de matrículas con filtros
     */
    async listar(filtros) {
        return await matriculaRepository.findAll(filtros);
    },

    /**
     * Obtiene una matrícula por ID
     */
    async obtenerPorId(id) {
        const matricula = await matriculaRepository.findById(id);
        if (!matricula) {
            const error = new Error("No se encontró la matrícula solicitada.");
            error.status = 404;
            throw error;
        }
        return matricula;
    },

    /**
     * CREACIÓN INDIVIDUAL
     * - Valida unicidad (Estudiante + Vigencia)
     * - Valida cupos en el grupo
     * - Crea la matrícula y el historial inicial en una transacción
     */
    async crear(datos, usuarioAuditorId) {
        try {
            return await sequelize.transaction(async (t) => {
                // Desestructuración de campos permitidos
                const {
                    estudianteId, grupoId, sedeId, vigenciaId, anioVigencia, observaciones, estado,
                    metodologia, es_nuevo, es_repitente, bloqueo_notas, situacion_ano_anterior
                } = datos;

                // Validar que no exista matrícula previa en esa vigencia
                const existe = await matriculaRepository.findByEstudianteYVigencia(
                    estudianteId,
                    vigenciaId,
                    { transaction: t }
                );
                if (existe) {
                    const error = new Error("El estudiante ya se encuentra matriculado en este año lectivo.");
                    error.status = 409;
                    throw error;
                }

                // Validar Cupos del Grupo
                const grupo = await Grupo.findByPk(grupoId, { transaction: t });
                if (!grupo) throw new Error("El grupo seleccionado no existe.");

                if (!grupo.sobrecupoPermitido) {
                    const matriculados = await matriculaRepository.countByGrupo(grupoId, vigenciaId, { transaction: t });
                    if (matriculados >= grupo.cupos) {
                        const error = new Error(`El grupo seleccionado no tiene cupos disponibles.`);
                        error.status = 409;
                        throw error;
                    }
                }

                // Generar Payload
                const nuevaMatriculaData = {
                    folio: generarFolio(anioVigencia || new Date().getFullYear()),
                    estudianteId,
                    grupoId,
                    sedeId,
                    vigenciaId,
                    observaciones,
                    metodologia: metodologia || "TRADICIONAL", // Valor por defecto si no viene
                    fechaHora: new Date(),
                    estado: estado || "PREMATRICULADO", // Valor por defecto si no viene
                    usuarioCreacion: usuarioAuditorId,
                    es_nuevo: !!es_nuevo, // Forzamos boolean por seguridad
                    es_repitente: !!es_repitente,
                    bloqueo_notas: !!bloqueo_notas,
                    situacion_ano_anterior: situacion_ano_anterior || "APROBO"
                };

                // Crear Matrícula
                const nuevaMatricula = await matriculaRepository.create(nuevaMatriculaData, { transaction: t });

                // Crear Historial Inicial (Auditoría)
                await HistorialMatriculas.create({
                    matriculaId: nuevaMatricula.id,
                    estadoNuevo: nuevaMatricula.estado,
                    grupoNuevoId: grupoId,
                    sedeNuevoId: sedeId,
                    usuarioId: usuarioAuditorId,
                    motivo: "Creación inicial de matrícula"
                }, { transaction: t });

                return nuevaMatricula;
            });
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * ACTUALIZACIÓN INDIVIDUAL
     * - Detecta cambios críticos (Grupo, Sede, Estado)
     * - Registra en historial si hay cambios
     */
    async actualizar(id, datos, usuarioAuditorId) {
        try {
            return await sequelize.transaction(async (t) => {
                const matriculaActual = await matriculaRepository.findById(id, { transaction: t });
                if (!matriculaActual) {
                    const error = new Error("No se encontró la matrícula solicitada.");
                    error.status = 404;
                    throw error;
                }

                // Extraer campos permitidos para update
                const {
                    grupoId, sedeId, estado, observaciones, metodologia, motivoRetiro,
                    es_nuevo, es_repitente, bloqueo_notas, situacion_ano_anterior
                } = datos;

                // Detectar cambios para el historial
                const cambios = [];
                let hayCambioCritico = false;

                // Cambio de Estado
                if (estado && estado !== matriculaActual.estado) {
                    hayCambioCritico = true;
                    cambios.push(`Estado: ${matriculaActual.estado} -> ${estado}`);
                }

                // Cambio de Grupo (Traslado interno)
                if (grupoId && Number(grupoId) !== matriculaActual.grupoId) {
                    hayCambioCritico = true;

                    const nuevoGrupo = await Grupo.findByPk(grupoId, { transaction: t });

                    // Validar cupos solo si me muevo a un grupo distinto
                    if (!nuevoGrupo.sobrecupoPermitido) {
                        const conteo = await matriculaRepository.countByGrupo(grupoId, matriculaActual.vigenciaId, { transaction: t });
                        if (conteo >= nuevoGrupo.cupos) {
                            throw new Error(`El grupo de destino no tiene cupos.`);
                        }
                    }
                    cambios.push("Cambio de Grupo");
                }

                if (sedeId && Number(sedeId) !== matriculaActual.sedeId) {
                    hayCambioCritico = true;
                    cambios.push("Cambio de Sede");
                }

                // Preparar objeto de actualización
                const datosActualizar = {
                    usuarioActualizacion: usuarioAuditorId
                };

                // Asignar solo los campos que vienen.
                if (observaciones !== undefined) datosActualizar.observaciones = observaciones;
                if (metodologia !== undefined) datosActualizar.metodologia = metodologia;
                if (grupoId) datosActualizar.grupoId = grupoId;
                if (sedeId) datosActualizar.sedeId = sedeId;
                if (estado) datosActualizar.estado = estado;
                if (motivoRetiro) datosActualizar.motivoRetiro = motivoRetiro;
                if (es_nuevo !== undefined) datosActualizar.es_nuevo = es_nuevo;
                if (es_repitente !== undefined) datosActualizar.es_repitente = es_repitente;
                if (bloqueo_notas !== undefined) datosActualizar.bloqueo_notas = bloqueo_notas;
                if (situacion_ano_anterior !== undefined) datosActualizar.situacion_ano_anterior = situacion_ano_anterior;

                // Si es retiro, llenar datos de retiro
                if ((estado === "RETIRADO" || estado === "DESERTADO") && matriculaActual.estado !== estado) {
                    datosActualizar.fechaRetiro = new Date();
                    datosActualizar.usuarioRetiro = usuarioAuditorId;
                }

                await matriculaRepository.update(id, datosActualizar, { transaction: t });

                // Registrar Historial si hubo cambios críticos
                if (hayCambioCritico) {
                    await HistorialMatriculas.create({
                        matriculaId: id,
                        estadoAnterior: matriculaActual.estado,
                        estadoNuevo: estado || matriculaActual.estado,
                        grupoAnteriorId: matriculaActual.grupoId,
                        grupoNuevoId: grupoId || matriculaActual.grupoId,
                        sedeAnteriorId: matriculaActual.sedeId,
                        sedeNuevoId: sedeId || matriculaActual.sedeId,
                        usuarioId: usuarioAuditorId,
                        motivo: observaciones || motivoRetiro || cambios.join(", ")
                    }, { transaction: t });
                }

                // Retornamos la matrícula actualizada
                return await matriculaRepository.findById(id, { transaction: t });
            });
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * ELIMINACIÓN INDIVIDUAL
     * - Registra en historial si hay cambios
     */
    async eliminar(id) {
        try {
            const registro = await matriculaRepository.findById(id);

            if (!registro) {
                const err = new Error("La matrícula no existe o ya fue eliminada.");
                err.status = 404;
                throw err;
            }

            await matriculaRepository.delete(id);
            return true;
        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "esta matrícula",
                "registros asociados"
            );
        }
    },

    /**
     * PROCESO MASIVO (Para Prematrícula / Promoción)
     * Recibe un array de estudiantes y los matricula en un grupo destino.
     */
    async prematricularMasivo({ estudiantesIds, grupoDestinoId, sedeId, vigenciaId, anioVigencia, usuarioId }) {
        try {
            return await sequelize.transaction(async (t) => {
                // Validar Grupo Destino y Cupos
                const grupo = await Grupo.findByPk(grupoDestinoId, { transaction: t });
                if (!grupo) throw new Error("El grupo de destino no existe.");

                // Validar cupo global para el bloque
                if (!grupo.sobrecupoPermitido) {
                    const actuales = await matriculaRepository.countByGrupo(grupoDestinoId, vigenciaId, { transaction: t });
                    const disponibles = grupo.cupos - actuales;
                    if (estudiantesIds.length > disponibles) {
                        throw new Error(`No hay suficientes cupos en el grupo de destino. Disponibles: ${disponibles}, Requeridos: ${estudiantesIds.length}`);
                    }
                }

                // Preparar el array de matrículas
                const matriculasParaCrear = estudiantesIds.map(estId => ({
                    folio: generarFolio(anioVigencia),
                    estudianteId: estId,
                    grupoId: grupoDestinoId,
                    sedeId: sedeId,
                    vigenciaId: vigenciaId,
                    estado: "PREMATRICULADO", // o "ACTIVA" según lógica de fechas
                    metodologia: "TRADICIONAL", // Valor por defecto
                    usuarioCreacion: usuarioId,
                    fechaHora: new Date()
                }));

                // Bulk Create (Matrículas)
                // ignoreDuplicates: false -> Lanza error si alguno ya tiene matrícula
                const nuevasMatriculas = await matriculaRepository.createBulk(matriculasParaCrear, { transaction: t });

                // Bulk Create (Historial)
                const historialParaCrear = nuevasMatriculas.map(mat => ({
                    matriculaId: mat.id,
                    estadoNuevo: "PREMATRICULADO",
                    grupoNuevoId: grupoDestinoId,
                    sedeNuevoId: sedeId,
                    usuarioId: usuarioId,
                    motivo: "Proceso masivo de matrícula/promoción"
                }));

                await HistorialMatriculas.bulkCreate(historialParaCrear, { transaction: t });

                return { procesados: matriculasParaCrear.length, mensaje: "Proceso masivo exitoso." };
            });
        } catch (error) {
            throw handleSequelizeError(error);
        }
    }
};