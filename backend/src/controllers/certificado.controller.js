import { certificadoService } from "../services/certificado.service.js";
import { certificadoRepository } from "../repositories/certificado.repository.js";
import { sendSuccess, sendError } from "../middleware/responseHandler.js";

/**
 * Codifica en Base64 UTF-8 el arreglo de estudiantes omitidos para enviarlo de forma segura en headers HTTP.
 */
const codificarHeaderOmitidos = (omitidos = []) => {
    return Buffer.from(JSON.stringify(omitidos), "utf-8").toString("base64");
};

const sanitizarNombreArchivo = (texto) => {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_");
};

const parseBoolean = (valor) => {
    if (typeof valor === "boolean") return valor;
    if (typeof valor === "string") {
        const normalizado = valor.trim().toLowerCase();
        return normalizado === "true" || normalizado === "1";
    }
    return Boolean(valor);
};

export const certificadoController = {
    async descargarCertificadoMatricula(req, res) {
        try {
            const { matriculaId, iniciaronClases, meses, comportamiento } = req.query;
            const iniciaron = parseBoolean(iniciaronClases);

            const pdfBuffer = await certificadoService.generarCertificadoMatricula({
                matriculaId: Number(matriculaId),
                iniciaronClases: iniciaron,
                meses: iniciaron ? meses : null,
                comportamiento: iniciaron ? comportamiento : null
            });

            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `Constancia_Matricula_${matriculaId}_${fecha}.pdf`;

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
            res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

            return res.send(pdfBuffer);
        } catch (error) {
            console.error("Error al generar constancia de matrícula:", error.message);
            return sendError(res, error.message, error.status || 400);
        }
    },

    async buscarEstudiante(req, res) {
        try {
            const { busqueda } = req.params;
            const estudiantes = await certificadoRepository.buscarEstudiantesGeneral(busqueda);

            if (!estudiantes || estudiantes.length === 0) {
                const error = new Error("No se encontró ningún estudiante con el criterio de busqueda ingresado.");
                error.status = 404;
                throw error;
            }

            // Formateamos el arreglo de estudiantes
            const dataFormat = estudiantes.map(est => ({
                id: est.id,
                nombreCompleto: `${est.primerNombre} ${est.segundoNombre || ''} ${est.primerApellido} ${est.segundoApellido || ''}`.replace(/\s+/g, ' ').trim(),
                documento: est.documento,
                matriculas: (est.matriculas || []).map(mat => ({
                    id: mat.id,
                    vigenciaId: mat.vigenciaId,
                    anio: mat.vigencia?.anio,
                    grado: mat.grupo?.grado?.nombre,
                    grupo: mat.grupo?.nombre,
                    jornada: mat.grupo?.jornada,
                    estado: mat.estado,
                    sede: mat.sede?.nombre
                }))
            }));

            return sendSuccess(res, dataFormat, "Búsqueda completada.");
        } catch (error) {
            console.error("Error al buscar estudiante:", error.message);
            return sendError(res, error.message, error.status || 400);
        }
    },

    async descargarCertificadoNotas(req, res) {
        try {
            const { matriculaId, periodo } = req.query;

            // Llamamos al servicio que acabamos de construir
            const pdfBuffer = await certificadoService.generarCertificadoNotas({
                matriculaId: Number(matriculaId),
                periodo: Number(periodo)
            });

            // Formateamos un nombre de archivo limpio
            const fecha = new Date().toISOString().split('T')[0];
            const textoPeriodo = Number(periodo) === 5 ? "Final" : `P${periodo}`;
            const nombreArchivo = `Cert_Notas_${matriculaId}_${textoPeriodo}_${fecha}.pdf`;

            // Configuramos los headers para forzar la descarga del PDF
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
            res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

            return res.send(pdfBuffer);
        } catch (error) {
            console.error("Error al generar certificado de notas:", error.message);
            return sendError(res, error.message, error.status || 400);
        }
    },

    async descargarCertificadosMatriculaMasivo(req, res) {
        try {
            const { grupoId, vigenciaId, iniciaronClases, meses, comportamiento } = req.query;
            const iniciaron = parseBoolean(iniciaronClases);

            const { pdfBuffer, omitidos, totalGenerados, grupoInfo } = await certificadoService.generarCertificadosMatriculaMasivo({
                grupoId: Number(grupoId),
                vigenciaId: Number(vigenciaId),
                iniciaronClases: iniciaron,
                meses: iniciaron ? meses : null,
                comportamiento: iniciaron ? comportamiento : null
            });

            const fecha = new Date().toISOString().split('T')[0];
            const gradoSlug = sanitizarNombreArchivo(grupoInfo.grado);
            const grupoSlug = sanitizarNombreArchivo(grupoInfo.grupo);
            const nombreArchivo = `Constancias_Matricula_${gradoSlug}_${grupoSlug}_${grupoInfo.anio}_${fecha}.pdf`;

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
            res.setHeader("X-Total-Generados", String(totalGenerados));
            res.setHeader("X-Omitidos", codificarHeaderOmitidos(omitidos));
            res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Total-Generados, X-Omitidos");

            return res.send(pdfBuffer);
        } catch (error) {
            console.error("Error al generar constancias de matrícula masivas:", error.message);
            const statusCode = error.status || 400;
            if (error.omitidos) {
                return res.status(statusCode).json({
                    status: "error",
                    message: error.message,
                    omitidos: error.omitidos
                });
            }
            return sendError(res, error.message, statusCode);
        }
    },

    async descargarCertificadosNotasMasivo(req, res) {
        try {
            const { grupoId, vigenciaId, periodo } = req.query;

            const { pdfBuffer, omitidos, totalGenerados, grupoInfo } = await certificadoService.generarCertificadosNotasMasivo({
                grupoId: Number(grupoId),
                vigenciaId: Number(vigenciaId),
                periodo: Number(periodo)
            });

            const fecha = new Date().toISOString().split('T')[0];
            const gradoSlug = sanitizarNombreArchivo(grupoInfo.grado);
            const grupoSlug = sanitizarNombreArchivo(grupoInfo.grupo);
            const textoPeriodo = Number(periodo) === 5 ? "Final" : `P${periodo}`;
            const nombreArchivo = `Certificados_Notas_${gradoSlug}_${grupoSlug}_${textoPeriodo}_${grupoInfo.anio}_${fecha}.pdf`;

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);
            res.setHeader("X-Total-Generados", String(totalGenerados));
            res.setHeader("X-Omitidos", codificarHeaderOmitidos(omitidos));
            res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, X-Total-Generados, X-Omitidos");

            return res.send(pdfBuffer);
        } catch (error) {
            console.error("Error al generar certificados de notas masivos:", error.message);
            const statusCode = error.status || 400;
            if (error.omitidos) {
                return res.status(statusCode).json({
                    status: "error",
                    message: error.message,
                    omitidos: error.omitidos
                });
            }
            return sendError(res, error.message, statusCode);
        }
    }
};