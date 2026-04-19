import { certificadoService } from "../services/certificado.service.js";
import { certificadoRepository } from "../repositories/certificado.repository.js";
import { sendSuccess, sendError } from "../middleware/responseHandler.js";

export const certificadoController = {
    async descargarCertificadoMatricula(req, res, next) {
        try {
            // Recibimos los parámetros por Query o Body (usaremos Query para descargas GET)
            const { matriculaId, iniciaronClases, meses, comportamiento } = req.query;

            if (!matriculaId) throw new Error("Debe proporcionar el ID de la matrícula.");

            // Convertimos 'true'/'false' a booleano real
            const iniciaron = String(iniciaronClases) === 'true';

            const pdfBuffer = await certificadoService.generarCertificadoMatricula({
                matriculaId: parseInt(matriculaId),
                iniciaronClases: iniciaron,
                meses: iniciaron ? meses : null,
                comportamiento: iniciaron ? comportamiento : null
            });

            const fecha = new Date().toISOString().split('T')[0];
            const nombreArchivo = `Constancia_Matricula_${matriculaId}_${fecha}.pdf`;

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);

            return res.send(pdfBuffer);

        } catch (error) {
            console.error("Error al generar constancia de matrícula:", error.message);
            const statusCode = error.status || 400;
            return sendError(res, error.message, statusCode);
        }
    },

    async buscarEstudiante(req, res, next) {
        try {
            const { busqueda } = req.params;
            if (!busqueda) throw new Error("Debe proporcionar un término de búsqueda.");

            const estudiantes = await certificadoRepository.buscarEstudiantesGeneral(busqueda);

            if (!estudiantes || estudiantes.length === 0) {
                const error = new Error("No se encontró ningún estudiante con esos datos.");
                error.status = 404;
                throw error;
            }

            // Formateamos el arreglo de estudiantes
            const dataFormat = estudiantes.map(est => ({
                id: est.id,
                nombreCompleto: `${est.primerNombre} ${est.segundoNombre || ''} ${est.primerApellido} ${est.segundoApellido || ''}`.replace(/\s+/g, ' ').trim(),
                documento: est.documento,
                matriculas: est.matriculas.map(mat => ({
                    id: mat.id,
                    anio: mat.vigencia.anio,
                    grado: mat.grupo.grado.nombre,
                    sede: mat.sede.nombre
                }))
            }));

            return sendSuccess(res, dataFormat, "Búsqueda completada.");
        } catch (error) {
            console.error("Error al buscar estudiante:", error.message);
            const statusCode = error.status || 400;
            return sendError(res, error.message, statusCode);
        }
    },

    async descargarCertificadoNotas(req, res, next) {
        try {
            // Recibimos los parámetros por Query
            const { matriculaId, periodo } = req.query;

            if (!matriculaId) throw new Error("Debe proporcionar el ID de la matrícula.");
            if (!periodo) throw new Error("Seleccionar un periodo para generar el certificado.");

            // Llamamos al servicio que acabamos de construir
            const pdfBuffer = await certificadoService.generarCertificadoNotas({
                matriculaId: parseInt(matriculaId),
                periodo: parseInt(periodo)
            });

            // Formateamos un nombre de archivo limpio
            const fecha = new Date().toISOString().split('T')[0];
            const textoPeriodo = parseInt(periodo) === 5 ? "Final" : `P${periodo}`;
            const nombreArchivo = `Certificado_Notas_${matriculaId}_${textoPeriodo}_${fecha}.pdf`;

            // Configuramos los headers para forzar la descarga del PDF
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);

            return res.send(pdfBuffer);

        } catch (error) {
            console.error("Error al generar certificado de notas:", error.message);
            const statusCode = error.status || 400;
            return sendError(res, error.message, statusCode);
        }
    }
};