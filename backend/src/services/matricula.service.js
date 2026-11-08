import fs from "fs/promises";
import path from "path";
import ExcelJS from "exceljs";
import { fileURLToPath } from "url";
import { pdfService } from "./pdf.service.js";
import { sequelize } from "../database/db.connect.js";
import { matriculaRepository } from "../repositories/matricula.repository.js";
import { vigenciaRepository } from "../repositories/vigencia.repository.js";
import { grupoRepository } from "../repositories/grupo.repository.js";
import { calificacionRepository } from "../repositories/calificacion.repository.js";
import { colegioRepository } from "../repositories/colegio.repository.js";
import { mapearDatosMatricula, formatearFecha } from "../utils/matriculaMapper.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

// Configuración de rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
                const {
                    estudianteId, grupoId, gradoId, sedeId, vigenciaId, anioVigencia, observaciones, estado,
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
                const grupo = await grupoRepository.findById(grupoId, vigenciaId);
                if (!grupo) throw new Error("El grupo seleccionado no existe para el año lectivo especificado.");

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
                    gradoId,
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
                const historialData = {
                    matriculaId: nuevaMatricula.id,
                    estadoNuevo: nuevaMatricula.estado,
                    grupoNuevoId: nuevaMatricula.grupoId,
                    sedeNuevoId: nuevaMatricula.sedeId,
                    usuarioId: usuarioAuditorId,
                    motivo: "Creación inicial de matrícula"
                };
                await matriculaRepository.crearHistorial(historialData, { transaction: t });

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
                    grupoId, gradoId, sedeId, estado, observaciones, metodologia, motivoRetiro,
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

                    const nuevoGrupo = await grupoRepository.findById(grupoId, matriculaActual.vigenciaId);

                    // Validar cupos solo si me muevo a un grupo distinto
                    if (!nuevoGrupo.sobrecupoPermitido) {
                        const conteo = await matriculaRepository.countByGrupo(grupoId, matriculaActual.vigenciaId, { transaction: t });
                        if (conteo >= nuevoGrupo.cupos) {
                            throw new Error(`El grupo de destino no tiene cupos para el año lectivo especificado.`);
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
                if (gradoId) datosActualizar.gradoId = gradoId;
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
                    await matriculaRepository.crearHistorial({
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

            // Buscar si el estudiante tiene calificaciones asociadas a esta vigencia/grupo
            const notasExistentes = await calificacionRepository.tieneCalificaciones(registro.estudianteId, registro.vigenciaId);

            if (notasExistentes > 0) {
                const err = new Error("La matrícula no puede eliminarse porque el estudiante ya tiene calificaciones registradas.");
                err.status = 409;
                throw err;
            }

            // Si pasa la validación (no tiene notas), se elimina de la base de datos
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
     * GENERAR PDF: ACTA INDIVIDUAL
     */
    async generarPdfActa(id) {
        const matriculaRaw = await matriculaRepository.findByIdCompleto(id);
        if (!matriculaRaw) throw new Error("Matrícula no encontrada");

        const colegio = await colegioRepository.findOne();
        const logoBase64 = await _obtenerLogoBase64();
        const fechaResStr = formatearFecha(colegio?.fechaResolucion);

        const dataMatriculas = {
            tituloDocumento: `Matricula_${matriculaRaw.estudiante.documento}`,
            encabezadoInstitucional: {
                nombre: colegio?.nombre || "INSTITUCIÓN EDUCATIVA CARLOS ADOLFO URUETA",
                info_legal: `Registro DANE: ${colegio?.registroDane || ''} | Resolución de Aprobación No. ${colegio?.resolucion || ''} del ${fechaResStr || ''}`,
                logoUrl: logoBase64,
                director: colegio?.director || "_______________________",
                secretaria: colegio?.secretaria || "_______________________"
            },
            matriculas: [mapearDatosMatricula(matriculaRaw)]
        };

        return await pdfService.crearPdfMatriculas(dataMatriculas);
    },

    /**
     * GENERAR PDF: ACTA POR LOTE (GRUPO)
     */
    async generarPdfLote(grupoId, vigenciaId) {
        const matriculasRaw = await matriculaRepository.findByGrupoCompleto(grupoId, vigenciaId);
        if (!matriculasRaw || matriculasRaw.length === 0) {
            throw new Error("No hay matrículas activas en este grupo para generar actas.");
        }

        const colegio = await colegioRepository.findOne();
        const logoBase64 = await _obtenerLogoBase64();
        const fechaResStr = formatearFecha(colegio?.fechaResolucion);

        const dataMatriculas = {
            tituloDocumento: `Actas_Matriculas_Grupo_${grupoId}`,
            encabezadoInstitucional: {
                nombre: colegio?.nombre || "INSTITUCIÓN EDUCATIVA CARLOS ADOLFO URUETA",
                info_legal: `Registro DANE: ${colegio?.registroDane || ''} | Resolución de Aprobación No. ${colegio?.resolucion || ''} del ${fechaResStr || ''}`,
                logoUrl: logoBase64,
                director: colegio?.director || "_______________________",
                secretaria: colegio?.secretaria || "_______________________"
            },
            matriculas: matriculasRaw.map(m => mapearDatosMatricula(m))
        };

        return await pdfService.crearPdfMatriculas(dataMatriculas);
    },

    /**
     * GENERAR PDF: ACTA EN BLANCO
     */
    async generarPdfBlanco() {
        const colegio = await colegioRepository.findOne();
        const logoBase64 = await _obtenerLogoBase64();
        const fechaResStr = formatearFecha(colegio?.fechaResolucion);

        const dataMatriculas = {
            tituloDocumento: `Formato_Matricula_En_Blanco`,
            encabezadoInstitucional: {
                nombre: colegio?.nombre || "INSTITUCIÓN EDUCATIVA CARLOS ADOLFO URUETA",
                info_legal: `Registro DANE: ${colegio?.registroDane || ''} | Resolución de Aprobación No. ${colegio?.resolucion || ''} del ${fechaResStr || ''}`,
                logoUrl: logoBase64,
                director: colegio?.director || "_______________________",
                secretaria: colegio?.secretaria || "_______________________"
            },
            matriculas: [mapearDatosMatricula({}, true)] // Flag en true para modo en blanco
        };

        return await pdfService.crearPdfMatriculas(dataMatriculas);
    },

    /**
     * GENERAR EXCEL: LISTADO DE MATRÍCULAS
     */
    async generarExcelListado(filtros) {
        // Usamos el findAll pero forzamos un límite alto para traer todos los de la búsqueda
        const resultado = await matriculaRepository.findAll({
            ...filtros,
            limit: 10000,
            page: 1
        });

        const matriculas = resultado.items;

        if (!matriculas || matriculas.length === 0) {
            throw new Error("No se encontraron registros para exportar con los filtros aplicados.");
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Listado Matrículas");

        // Definir las columnas
        worksheet.columns = [
            { header: "Estudiante", key: "nombres", width: 40 },
            { header: "Tipo Doc.", key: "tipo_doc", width: 12 },
            { header: "Documento", key: "documento", width: 18 },
            { header: "Edad", key: "edad", width: 10 },
            { header: "Folio Matrícula", key: "folio", width: 22 },
            { header: "Sede", key: "sede", width: 30 },
            { header: "Jornada", key: "jornada", width: 15 },
            { header: "Grado", key: "grado", width: 25 },
            { header: "Grupo", key: "grupo", width: 15 },
            { header: "Estado", key: "estado", width: 18 }
        ];

        // Estilos para la cabecera
        worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
        worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0056B3" } };
        worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

        // ACTIVAR AUTO-FILTROS (Desde la columna A hasta la J en la fila 1)
        worksheet.autoFilter = 'A1:J1';

        // Congelar la primera fila para que siempre sea visible al hacer scroll
        worksheet.views = [
            { state: 'frozen', xSplit: 0, ySplit: 1 }
        ];

        // Función auxiliar para calcular la edad
        const calcularEdad = (fechaNacimiento) => {
            if (!fechaNacimiento) return "N/A";
            const hoy = new Date();
            const nacimiento = new Date(fechaNacimiento);
            let edad = hoy.getFullYear() - nacimiento.getFullYear();
            const mes = hoy.getMonth() - nacimiento.getMonth();
            if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
                edad--;
            }
            return edad;
        };

        // Llenar las filas
        matriculas.forEach((mat) => {
            const est = mat.estudiante;
            const nombreCompleto = `${est.primerNombre || ''} ${est.segundoNombre || ''} ${est.primerApellido || ''} ${est.segundoApellido || ''}`.replace(/\s+/g, ' ').trim();
            const gradoNombre = mat.grupo?.grado?.nombre ? mat.grupo.grado.nombre.replace(/_/g, " ") : "Sin Grado";
            const grupoNombre = mat.grupo?.nombre ? mat.grupo.nombre : "N/A";
            const jornada = mat.grupo?.jornada ? mat.grupo.jornada.replace("MANANA", "MAÑANA") : "N/A";

            worksheet.addRow({
                nombres: nombreCompleto,
                tipo_doc: est.tipoDocumento,
                documento: est.documento,
                edad: calcularEdad(est.fechaNacimiento),
                folio: mat.folio,
                sede: mat.sede?.nombre || "N/A",
                jornada: jornada,
                grado: gradoNombre,
                grupo: grupoNombre,
                estado: mat.estado
            });
        });

        return await workbook.xlsx.writeBuffer();
    },

    /**
     * FORMALIZACIÓN - PASO 1: Consulta origen con exclusión cruzada y regla de egresados (Por Código)
     */
    async obtenerEvaluadosParaFormalizar(grupoId, vigenciaId, vigenciaDestinoId) {
        // 1. Consultar el grupo de origen para identificar su grado
        const grupoOrigen = await grupoRepository.findById(grupoId, vigenciaId);
        if (!grupoOrigen) throw new Error("El grupo de origen no fue encontrado en la base de datos.");

        // Extraemos el código exacto del grado
        const codigoGradoOrigen = grupoOrigen.grado?.codigo;

        // Identificar si es un grado terminal usando los códigos estandarizados
        const esGradoTerminal = codigoGradoOrigen === '11' || codigoGradoOrigen === 'C6';

        // 2. Obtener todos los del grupo origen
        const resultado = await matriculaRepository.findAll({
            grupoId: grupoId,
            vigenciaId: vigenciaId,
            limit: 500,
            page: 1
        });

        // 3. Filtrar aplicando la Regla de Negocio de Egresados
        const evaluadosBase = resultado.items.filter(m => {
            if (m.estado === 'REPROBADO') return true; // Los reprobados siempre se muestran para que repitan

            if (m.estado === 'PROMOVIDO') {
                if (esGradoTerminal) {
                    return false; // Si aprobó el grado 11 o C6, es Egresado. No se puede matricular de nuevo.
                }
                return true; // Promovidos de otros grados sí pasan
            }
            return false;
        });

        const evaluadosFinales = [];

        // 4. Excluir a los que ya tienen matrícula en el año destino
        for (const m of evaluadosBase) {
            const est = m.estudiante;

            const matriculaExistente = await matriculaRepository.findByEstudianteYVigencia(est.id, vigenciaDestinoId);

            if (matriculaExistente) {
                // Si el destino es la misma vigencia del origen (Ciclo V -> Ciclo VI)
                if (matriculaExistente.id !== m.id) {
                    continue; // Se omite, ya fue formalizado en otro grupo
                }
            }

            const nombreCompleto = `${est.primerApellido || ''} ${est.segundoApellido || ''} ${est.primerNombre || ''} ${est.segundoNombre || ''}`.replace(/\s+/g, ' ').trim();

            evaluadosFinales.push({
                id: m.id,
                estudianteId: est.id,
                documento: est.documento,
                nombreCompleto: nombreCompleto,
                dictamen: m.estado
            });
        }

        return evaluadosFinales.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
    },

    /**
     * FORMALIZACIÓN - PASO 2: Ejecuta Inserción Masiva
     */
    async formalizarMatriculasLote(destino, estudiantes, usuarioAuditorId) {
        try {
            return await sequelize.transaction(async (t) => {
                // 1. Obtener datos del año de destino para armar el folio
                const vigenciaDestino = await vigenciaRepository.findById(destino.vigenciaId, { transaction: t });
                if (!vigenciaDestino) throw new Error("El año lectivo de destino no existe.");

                // 2. Validar Cupos del grupo destino
                const grupoDestinoObj = await grupoRepository.findById(destino.grupoId, destino.vigenciaId, { transaction: t });
                if (!grupoDestinoObj) throw new Error("El grupo de destino no existe.");

                if (!grupoDestinoObj.sobrecupoPermitido) {
                    const ocupados = await matriculaRepository.countByGrupo(destino.grupoId, destino.vigenciaId, { transaction: t });
                    if (ocupados + estudiantes.length > grupoDestinoObj.cupos) {
                        throw new Error(`El grupo destino no tiene cupos suficientes. Cupos disponibles: ${grupoDestinoObj.cupos - ocupados}`);
                    }
                }

                const nombreGradoDestino = (grupoDestinoObj.grado?.nombre || "").toUpperCase();
                const esDestinoCicloVI = nombreGradoDestino.includes("CICLO_VI") || nombreGradoDestino.includes("CICLO VI");

                let procesados = 0;
                let omitidos = 0;

                // 3. Procesar cada estudiante
                for (const est of estudiantes) {
                    // Validar que no esté matriculado ya en el año destino
                    const matriculaExistente = await matriculaRepository.findByEstudianteYVigencia(est.estudianteId, destino.vigenciaId, { transaction: t });
                    if (matriculaExistente) {
                        // Permitir doble matrícula solo si es PROMOVIDO y el destino es CICLO VI
                        const esExcepcionCiclo = (matriculaExistente.estado === 'PROMOVIDO' && esDestinoCicloVI);

                        if (!esExcepcionCiclo) {
                            omitidos++;
                            continue; // Si no es la excepción, bloqueamos la doble matrícula en el mismo año
                        }
                    }

                    // APLICACIÓN DE REGLAS DE NEGOCIO SEGÚN DICTAMEN
                    const esRepitente = est.dictamen === 'REPROBADO';
                    const situacionAnterior = esRepitente ? 'REPROBO' : 'APROBO';

                    const nuevaMatriculaData = {
                        folio: generarFolio(vigenciaDestino.anio),
                        estudianteId: est.estudianteId,
                        gradoId: grupoDestinoObj.gradoId,
                        grupoId: destino.grupoId,
                        sedeId: destino.sedeId,
                        vigenciaId: destino.vigenciaId,
                        estado: "ACTIVA",
                        metodologia: "TRADICIONAL",
                        es_nuevo: false, // Son estudiantes antiguos que vienen del origen
                        es_repitente: esRepitente,
                        situacion_ano_anterior: situacionAnterior,
                        bloqueo_notas: false,
                        fechaHora: new Date(),
                        usuarioCreacion: usuarioAuditorId
                    };

                    // Insertar en BD
                    const nuevaMatricula = await matriculaRepository.create(nuevaMatriculaData, { transaction: t });

                    // Registrar Auditoría
                    await matriculaRepository.crearHistorial({
                        matriculaId: nuevaMatricula.id,
                        estadoNuevo: "ACTIVA",
                        grupoNuevoId: destino.grupoId,
                        sedeNuevoId: destino.sedeId,
                        usuarioId: usuarioAuditorId,
                        motivo: `Formalización de matrícula por Promoción/Repitencia (${est.dictamen})`
                    }, { transaction: t });

                    procesados++;
                }

                if (procesados === 0 && omitidos > 0) {
                    throw new Error("Todos los estudiantes seleccionados ya están matriculados en el año lectivo de destino.");
                }

                return {
                    procesados,
                    omitidos,
                    mensaje: `Se formalizaron exitosamente ${procesados} matrículas.` + (omitidos > 0 ? ` (Se omitieron ${omitidos} por tener matrícula activa en el mismo año lectivo).` : "")
                };
            });
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },
};

// Función para cargar el logo institucional y convertirlo a Base64 para incrustarlo en el PDF
async function _obtenerLogoBase64() {
    try {
        const logoPath = path.join(__dirname, '../../public/uploads/institucional/escudo-instecau.png');
        const imageBuffer = await fs.readFile(logoPath);
        const ext = path.extname(logoPath).substring(1);
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.warn("⚠️ No se pudo cargar el logo para el PDF.");
        return "";
    }
}