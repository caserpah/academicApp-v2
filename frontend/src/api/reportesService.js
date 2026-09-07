import apiClient from './apiClient.js';
import { parseError } from "../utils/errorHandler.js";

const REPORTES_ENDPOINT = '/api/reportes';

/**
 * Descarga el PDF de la Sábana seleccionada
 * @param {Object} params - { grupoId, tipoSabana, asignaturaId, periodo }
 */
export const descargarSabanaPdf = async (params) => {
    try {
        const response = await apiClient.get(`${REPORTES_ENDPOINT}/sabanas/pdf`, {
            params,
            responseType: 'blob', // Crítico para descargar PDFs
        });

        // Crear URL temporal y forzar la descarga
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;

        const fecha = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `Sabana_${params.tipoSabana}_${fecha}.pdf`);

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
        throw parseError(error, "Error de red al intentar generar el documento PDF.");
    }
};