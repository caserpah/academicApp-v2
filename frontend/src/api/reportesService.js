import apiClient from './apiClient.js';
import { parseError } from "../utils/errorHandler.js";

const REPORTES_ENDPOINT = '/api/reportes';

/**
 * Descarga el PDF o Excel de la Sábana seleccionada
 * @param {Object} params - { grupoId, tipoSabana, asignaturaId, periodo }
 * @param {String} formato - 'pdf' o 'excel'
 */

export const descargarSabana = async (params, formato = 'pdf') => {
    try {
        const response = await apiClient.get(`${REPORTES_ENDPOINT}/sabanas/${formato}`, {
            params: { ...params, formato },
            responseType: 'blob',
        });

        // Seleccionamos el MIME Type y la extensión según el formato solicitado
        const mimeType = formato === 'excel'
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf';
        const extension = formato === 'excel' ? 'xlsx' : 'pdf';

        // Crear URL temporal y forzar la descarga
        const url = window.URL.createObjectURL(new Blob([response.data], { type: mimeType }));
        const link = document.createElement('a');
        link.href = url;

        const fecha = new Date().toISOString().split('T')[0];
        const nombreGrupo = params.grupoNombre || params.grupoId;
        link.setAttribute('download', `${params.tipoSabana}_${nombreGrupo}_${fecha}.${extension}`);

        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        if (error.response && error.response.data instanceof Blob) {
            let mensajeError = "Error al descargar el reporte.";

            try {
                // Solo intentamos parsear el blob, no lanzamos errores aquí adentro
                const errorText = await error.response.data.text();
                const errorJson = JSON.parse(errorText);
                mensajeError = errorJson.message || errorJson.error || mensajeError;
            } catch (e) {
                console.error("El servidor respondió con HTML o texto plano, no JSON:", e);
            }
            throw new Error(mensajeError);
        }
        throw parseError(error, "Error de red al intentar generar el documento.");
    }
};