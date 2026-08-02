import { matriculaService } from "../services/matricula.service.js";
import { Matricula } from "../models/matricula.js";
import { sendSuccess, sendError } from "../middleware/responseHandler.js";
import { getVigenciaFromRequest } from "../utils/vigencia.helper.js";
import { Vigencia } from "../models/vigencia.js";
import { Op } from "sequelize";

export const matriculaController = {

    /**
     * GET /api/matriculas
     * Lista matrículas con paginación y filtros.
     */
    async listar(req, res, next) {
        try {
            // Obtener contexto de vigencia
            const vigenciaContexto = getVigenciaFromRequest(req);

            // Tomar la vigencia del query param, y si no viene, usar el contexto actual
            const vigenciaIdFiltro = req.query.vigenciaId ? Number(req.query.vigenciaId) : vigenciaContexto.id;

            // Construir filtros desde query params
            const filtros = {
                page: req.query.page,
                limit: req.query.limit,
                vigenciaId: vigenciaIdFiltro,
                sedeId: req.query.sedeId,
                grupoId: req.query.grupoId,
                gradoId: req.query.gradoId,
                estado: req.query.estado,
                busqueda: req.query.busqueda,
                orderBy: req.query.orderBy,
                order: req.query.order,
                bloqueo_notas: req.query.bloqueo_notas,
                es_nuevo: req.query.es_nuevo,
                es_repitente: req.query.es_repitente,
                situacion_ano_anterior: req.query.situacion_ano_anterior,
                jornada: req.query.jornada
            };

            // Llamar al servicio
            const resultado = await matriculaService.listar(filtros);
            return sendSuccess(res, resultado);

        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/matriculas/:id
     */
    async obtenerPorId(req, res, next) {
        try {
            const { id } = req.params;
            const matricula = await matriculaService.obtenerPorId(id);
            return sendSuccess(res, matricula);
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/matriculas
     * Crea una matrícula individual.
     */
    async crear(req, res, next) {
        try {
            const usuarioAuditorId = req.user?.id;

            // Obtenemos la vigencia "por defecto" (la actual del sistema)
            const vigenciaDefault = getVigenciaFromRequest(req);

            let vigenciaFinal = vigenciaDefault;
            let anioFinal = vigenciaDefault.anio;

            // Si el usuario envió una vigenciaId distinta en el formulario...
            if (req.body.vigenciaId && req.body.vigenciaId != vigenciaDefault.id) {
                // ...buscamos esa vigencia en la BD para asegurarnos que existe y obtener su año (para el folio)
                const vigenciaSeleccionada = await Vigencia.findByPk(req.body.vigenciaId);

                if (!vigenciaSeleccionada) {
                    return sendError(res, "El año lectivo seleccionado no es válido.", 400);
                }
                vigenciaFinal = vigenciaSeleccionada;
                anioFinal = vigenciaSeleccionada.anio; // Necesario para generar el folio (MAT-202X-...)
            }

            const datos = {
                ...req.body,
                vigenciaId: vigenciaFinal.id, // Usamos la vigencia final seleccionada por el usuario
                anioVigencia: anioFinal // Usamos el año de la vigencia final para el folio
            };

            const nuevaMatricula = await matriculaService.crear(datos, usuarioAuditorId);
            return sendSuccess(res, nuevaMatricula, "La matrícula fue registrada exitosamente", 201);

        } catch (error) {
            next(error);
        }
    },

    /**
     * PUT /api/matriculas/:id
     * Actualiza matrícula (estado, traslados, etc).
     */
    async actualizar(req, res, next) {
        try {
            const { id } = req.params;
            const usuarioAuditorId = req.user?.id;
            const datosActualizar = { ...req.body };

            // --- VALIDACIÓN DE CAMBIO DE AÑO LECTIVO ---
            if (datosActualizar.vigenciaId) {
                // Verificar que el año destino existe
                const vigenciaDestino = await Vigencia.findByPk(datosActualizar.vigenciaId);
                if (!vigenciaDestino) {
                    return sendError(res, "El año lectivo seleccionado no existe.", 400);
                }

                // Obtener el ID del estudiante para verificar duplicados
                // Si viene en el body lo usamos, si no, buscamos la matrícula actual
                let idEstudiante = datosActualizar.estudianteId;
                let idGradoDestino = datosActualizar.gradoId;

                if (!idEstudiante || !idGradoDestino) {
                    const matriculaActual = await Matricula.findByPk(id, { attributes: ['estudianteId', 'gradoId', 'vigenciaId'] });
                    if (!matriculaActual) return sendError(res, "La matrícula a editar no existe.", 404);
                    if (!idEstudiante) idEstudiante = matriculaActual.estudianteId;
                    if (!idGradoDestino) idGradoDestino = datosActualizar.gradoId || matriculaActual.gradoId;
                }

                const vigenciaObjetivo = datosActualizar.vigenciaId || (await Matricula.findByPk(id, { attributes: ['vigenciaId'] }))?.vigenciaId;

                // Verificar que el estudiante no tenga otra matrícula en el mismo grado y misma vigencia
                const existe = await Matricula.findOne({
                    where: {
                        estudianteId: idEstudiante,
                        vigenciaId: vigenciaObjetivo,
                        gradoId: idGradoDestino,
                        id: { [Op.ne]: id }
                    }
                });
                if (existe) {
                    throw new Error("El estudiante ya tiene una matrícula registrada en este mismo grado para el año lectivo seleccionado.");
                }
            }

            const matriculaActualizada = await matriculaService.actualizar(id, datosActualizar, usuarioAuditorId);

            return sendSuccess(res, matriculaActualizada, "La matrícula fue actualizada exitosamente");

        } catch (error) {
            next(error);
        }
    },

    /**
     * DELETE /api/matriculas/:id
     * Elimina una matrícula (si es posible).
     */
    async eliminar(req, res, next) {
        try {
            const { id } = req.params;

            const eliminada = await matriculaService.eliminar(id);
            return sendSuccess(res, eliminada, "La matrícula fue eliminada exitosamente");
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/matriculas/masivo
     * Matrículas masiva.
     */
    async activarMasivo(req, res, next) {
        try {
            const usuarioId = req.user?.id;
            const vigenciaContexto = getVigenciaFromRequest(req); // Obtenemos la vigencia por defecto del sistema

            // Priorizamos la vigenciaId enviada de forma explícita por el frontend.
            // Si por alguna razón no viaja, se respalda en la vigencia del contexto actual.
            const vigenciaIdFinal = req.body.vigenciaId || vigenciaContexto?.id;

            // Validación de seguridad: asegurarse de que se seleccione una sede y un grupo
            if (!req.body.sedeId || !req.body.grupoId) {
                return sendError(res, "Por seguridad, debe seleccionar una sede y un grupo específico para realizar la matriculación masiva.", 400);
            }

            // Se capturan los filtros aplicados en pantalla
            const filtros = {
                sedeId: req.body.sedeId,
                grupoId: req.body.grupoId,
                vigenciaId: vigenciaIdFinal
            };

            const resultado = await matriculaService.activarPrematriculasMasivo({ filtros, usuarioId });
            return sendSuccess(res, resultado, resultado.mensaje, 200);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/matriculas/:id/pdf
     */
    async descargarPdfActa(req, res, next) {
        try {
            const { id } = req.params;
            const pdfBuffer = await matriculaService.generarPdfActa(id);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="Acta_Matricula_${id}.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/matriculas/lote/pdf?grupoId=1
     */
    async descargarPdfLote(req, res, next) {
        try {
            const { grupoId } = req.query;
            const vigencia = getVigenciaFromRequest(req); // Usamos la vigencia del contexto

            if (!grupoId) return sendError(res, "Se requiere el ID del grupo.", 400);

            const pdfBuffer = await matriculaService.generarPdfLote(grupoId, vigencia.id);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="Actas_Grupo_${grupoId}.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/matriculas/formato/blanco
     */
    async descargarPdfBlanco(req, res, next) {
        try {
            const pdfBuffer = await matriculaService.generarPdfBlanco();

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="Formato_Matricula.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            next(error);
        }
    }
};