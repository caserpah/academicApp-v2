import apiClient from './apiClient.js';
import { parseError } from "../utils/errorHandler.js";

const PLANILLAS_ENDPOINT = '/api/planillas';

/**
 * Descarga el PDF de la planilla generada
 * @param {number|string} grupoId - ID del grupo seleccionado
 * @param {string} tipoPlanilla - 'ASISTENCIA', 'SEGUIMIENTO', 'CALIFICACIONES', 'COMPORTAMIENTO'
 */
export const descargarPlanillaPdf = async (grupoId, tipoPlanilla) => {
    try {
        const response = await apiClient.get(`${PLANILLAS_ENDPOINT}/pdf`, {
            params: { grupoId, tipoPlanilla },
            responseType: 'blob', // Crítico para recibir archivos binarios
        });

        // Crear URL temporal y forzar la descarga en el navegador
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;

        // Formatear un nombre de archivo limpio
        const fecha = new Date().toISOString().split('T')[0];
        link.setAttribute('download', `Planilla_${tipoPlanilla}_${fecha}.pdf`);

        document.body.appendChild(link);
        link.click();

        // Limpieza de memoria
        link.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        // Manejo especial: Si el backend envía un JSON con error (ej. 403),
        // Axios lo envuelve en un Blob porque pedimos responseType: 'blob'.
        if (error.response && error.response.data instanceof Blob) {
            try {
                const errorText = await error.response.data.text();
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.message || "Error al descargar la planilla.");
            } catch (e) {
                console.error("Error al parsear el mensaje de error del servidor:", e);
                throw new Error("Error desconocido al procesar la respuesta del servidor.");
            }
        }

        throw parseError(error, "Error de red al intentar generar el documento PDF.");
    }
};