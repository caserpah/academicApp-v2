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
     * GET /api/matriculas/:id/pdf
     */
    async descargarPdfActa(req, res, next) {
        try {
            const { id } = req.params;
            const pdfBuffer = await matriculaService.generarPdfActa(id);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="Matricula_${id}.pdf"`);
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
    },

    /**
     * GET /api/matriculas/listado/excel
     */
    async descargarExcelListado(req, res, next) {
        try {
            const vigenciaContexto = getVigenciaFromRequest(req);
            const vigenciaIdFiltro = req.query.vigenciaId ? Number(req.query.vigenciaId) : vigenciaContexto.id;

            const filtros = {
                vigenciaId: vigenciaIdFiltro,
                sedeId: req.query.sedeId,
                grupoId: req.query.grupoId,
                gradoId: req.query.gradoId,
                estado: req.query.estado,
                busqueda: req.query.busqueda,
                jornada: req.query.jornada
            };

            const excelBuffer = await matriculaService.generarExcelListado(filtros);

            const estadoNombre = filtros.estado || 'Todos';
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="Listado_Matriculas_${estadoNombre}.xlsx"`);
            return res.send(excelBuffer);
        } catch (error) {
            next(error);
        }
    },

    /**
     * GET /api/matriculas/formalizacion/pendientes
     * Obtiene estudiantes con dictamen PROMOVIDO o REPROBADO de un grupo origen
     */
    async consultarPendientesFormalizacion(req, res, next) {
        try {
            const { grupoId, vigenciaId, vigenciaDestinoId } = req.query;

            if (!grupoId || !vigenciaId || !vigenciaDestinoId) {
                return sendError(res, "Debe seleccionar el grupo y años lectivos de origen y destino.", 400);
            }

            const pendientes = await matriculaService.obtenerEvaluadosParaFormalizar(grupoId, vigenciaId, vigenciaDestinoId);
            return sendSuccess(res, pendientes, "Estudiantes evaluados recuperados exitosamente.");
        } catch (error) {
            next(error);
        }
    },

    /**
     * POST /api/matriculas/formalizacion/ejecutar
     * Crea las nuevas matrículas aplicando las reglas de repitencia según el dictamen
     */
    async formalizarMasivo(req, res, next) {
        try {
            const usuarioAuditorId = req.user?.id;
            const { destino, estudiantes } = req.body;

            if (!destino || !estudiantes || estudiantes.length === 0) {
                return sendError(res, "Datos incompletos para formalizar las matrículas.", 400);
            }

            const resultado = await matriculaService.formalizarMatriculasLote(destino, estudiantes, usuarioAuditorId);
            return sendSuccess(res, resultado, resultado.mensaje, 201);
        } catch (error) {
            next(error);
        }
    }
};