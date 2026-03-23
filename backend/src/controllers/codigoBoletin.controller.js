import { codigoBoletinService } from "../services/codigoBoletin.service.js";
import { boletinService } from "../services/boletin.service.js";
import { pdfService } from "../services/pdf.service.js";

export const codigoBoletinController = {

    /**
     * ==========================================
     * ACCESO PÚBLICO (EL PUENTE DEL ACUDIENTE)
     * ==========================================
     * GET /api/boletines/publico/:codigo
     */
    async descargarPublico(req, res) {
        try {
            const { codigo } = req.params;

            if (!codigo) {
                return res.status(400).json({ message: "El código de descarga es obligatorio." });
            }

            // 1. Validar el código y obtener los datos necesarios para generar el boletín
            const datosDescarga = await codigoBoletinService.descargarBoletinPublico(codigo);

            // 2. Extraemos los datos necesarios para generar el PDF a partir del Mega-Objeto JSON que ya armó el servicio
            const grupoId = datosDescarga.grupo.id;
            const vigenciaId = datosDescarga.vigenciaId;
            const periodoActual = datosDescarga.periodo;
            const estudianteId = datosDescarga.estudiante.id;
            const anioLectivo = datosDescarga.vigencia.anio;
            const tipoBoletin = "DESCRIPTIVO";

            // 3. Llamamos al servicio para que arme el Mega-Objeto JSON SOLO de ese estudiante (le pasamos el estudianteId)
            const dataBoletines = await boletinService.generarDatosBoletinLote(
                grupoId,
                vigenciaId,
                anioLectivo,
                periodoActual,
                tipoBoletin,
                estudianteId
            );

            // 4. Mandamos el JSON a la plantilla HTML y generamos el PDF
            const pdfBuffer = await pdfService.crearPdfBoletines(dataBoletines);

            // 5. Configuramos las cabeceras HTTP para enviar el PDF directamente al navegador con un nombre de archivo sugerido
            const nombreArchivo = `Boletin_${datosDescarga.estudiante.documento}_P${periodoActual}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`); // Inline para mostrar en el navegador, cambiar por attachment para forzar descarga

            // 6. Enviamos el PDF al navegador del acudiente
            return res.send(pdfBuffer);

        } catch (error) {
            console.error("Error en descarga pública:", error);
            const status = error.status || 500;
            // Si el error es por código inválido o bloqueado, podemos enviar un mensaje más amigable
            if (status === 404) {
                return res.status(404).json({ message: "Código no encontrado o ya ha sido utilizado." });
            }
            return res.status(status).json({ message: error.message || "Error interno al procesar el código." });
        }
    },

    /**
     * ==========================================
     * 2. GENERACIÓN MASIVA (SECRETARÍA)
     * ==========================================
     * POST /api/boletines/generar-lote
     */
    async generarLote(req, res) {
        try {
            const { grupoId, vigenciaId, periodo } = req.body;
            const usuarioGeneracionId = req.usuario.id; // Obtenemos el ID del usuario que genera el lote desde el middleware de autenticación

            if (!grupoId || !vigenciaId || !periodo) {
                return res.status(400).json({ message: "Faltan parámetros obligatorios (grupoId, vigenciaId, periodo)." });
            }

            const resultado = await codigoBoletinService.generarCodigosLote(grupoId, vigenciaId, periodo, usuarioGeneracionId);

            return res.status(201).json(resultado);
        } catch (error) {
            console.error("Error al generar lote de códigos:", error);
            const status = error.status || 500;
            return res.status(status).json({ message: error.message || "Error interno al generar los códigos." });
        }
    },

    /**
     * ==========================================
     * GESTIÓN ADMINISTRATIVA (LISTADO)
     * ==========================================
     * GET /api/boletines/grupo/:grupoId/vigencia/:vigenciaId/periodo/:periodo
     */
    async listarPorGrupo(req, res) {
        try {
            const { grupoId, periodo } = req.params;
            const { busqueda } = req.query; // Por si la secretaria quiere buscar a un estudiante en particular

            const vigenciaId = req.vigenciaActual.id; // Obtenemos la vigencia actual desde el middleware que la inyecta en la solicitud

            if (!grupoId || !vigenciaId || !periodo) {
                return res.status(400).json({ message: "Faltan parámetros obligatorios (Grupo, Año Lectivo, Periodo)." });
            }

            const codigos = await codigoBoletinService.obtenerCodigosDeGrupo({
                grupoId, vigenciaId, periodo, busqueda
            });

            return res.status(200).json(codigos);
        } catch (error) {
            console.error("Error al listar códigos:", error);
            return res.status(500).json({ message: "Error interno al obtener el listado." });
        }
    },

    /**
     * ==========================================
     * BOTÓN DE PÁNICO (BLOQUEAR/DESBLOQUEAR)
     * ==========================================
     * PATCH /api/boletines/:id/estado
     */
    async alternarEstado(req, res) {
        try {
            const { id } = req.params;
            const { activo } = req.body; // Recibe si actualmente es true o false
            if (activo === undefined) {
                return res.status(400).json({ message: "Debe enviar el estado actual del código." });
            }

            // Forzamos la conversión a booleano puro por si acaso llega como string "false"
            const estadoBooleano = activo === true || activo === "true" || activo === 1;

            const resultado = await codigoBoletinService.alternarEstado(id, estadoBooleano);

            return res.status(200).json(resultado);
        } catch (error) {
            console.error("Error al alternar estado del código:", error);
            return res.status(500).json({ message: "Error interno al actualizar el estado." });
        }
    }
};