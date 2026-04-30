

import { listadoService } from "../services/listado.service.js";

export const listadoController = {

    // 1. Obtener catálogo para los selectores
    async obtenerFiltros(req, res) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const filtros = await listadoService.obtenerCatalogoFiltros(vigenciaId);
            return res.status(200).json(filtros);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Error al obtener filtros" });
        }
    },

    // 2. Generar PDF: Estudiantes (Por rangos masivos)
    async descargarEstudiantes(req, res) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const anioLectivo = req.vigenciaActual.anio;
            // El frontend enviará el objeto filtros como un string JSON
            const filtros = JSON.parse(req.query.filtros);

            if (!vigenciaId || !filtros.rangoInicial || !filtros.rangoFinal) {
                throw new Error("Faltan parámetros de rango o vigencia.");
            }

            const pdfBuffer = await listadoService.generarListadoEstudiantes(vigenciaId, anioLectivo, filtros);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="Listado_Estudiantes_${new Date().getTime()}.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            console.error("Error al generar listado de estudiantes:", error);
            return res.status(400).json({ message: error.message || "Error al generar el listado." });
        }
    },

    // 3. Generar PDF: Directores de Grupo
    async descargarDirectores(req, res) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const { sedeId } = req.query;

            const pdfBuffer = await listadoService.generarListadoDirectores(vigenciaId, sedeId);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="Listado_Directores_${new Date().getTime()}.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Error al generar el listado." });
        }
    },

    // 4. Generar PDF: Docentes
    async descargarDocentes(req, res) {
        try {
            const { sedeId } = req.query;
            const pdfBuffer = await listadoService.generarListadoDocentes(sedeId);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="Listado_Docentes_${new Date().getTime()}.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Error al generar el listado." });
        }
    },

    // 5. Generar PDF: Áreas y Asignaturas
    async descargarAreas(req, res) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const { incluirAsignaturas } = req.query;

            // Convertimos el string a booleano
            const conAsignaturas = incluirAsignaturas === 'true';

            const pdfBuffer = await listadoService.generarListadoAreasAsignaturas(vigenciaId, conAsignaturas);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="Listado_Areas_${new Date().getTime()}.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Error al generar el listado." });
        }
    },

    // 6. Generar PDF: Intensidad Horaria por Grupos
    async descargarCargaGrupos(req, res) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const anioLectivo = req.vigenciaActual.anio;
            const { sedeId } = req.query;

            const pdfBuffer = await listadoService.generarListadoCargaGrupos(vigenciaId, anioLectivo, sedeId);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="Intensidad_Grupos_${new Date().getTime()}.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Error al generar el listado de intensidad." });
        }
    },

    // 7. Generar PDF: Carga Académica por Docentes
    async descargarCargaDocentes(req, res) {
        try {
            const vigenciaId = req.vigenciaActual.id;
            const anioLectivo = req.vigenciaActual.anio;
            const { sedeId, docenteId } = req.query;

            const pdfBuffer = await listadoService.generarListadoCargaDocentes(vigenciaId, anioLectivo, sedeId, docenteId);

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="Carga_Docentes_${new Date().getTime()}.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            return res.status(400).json({ message: error.message || "Error al generar el listado de carga docente." });
        }
    }
};