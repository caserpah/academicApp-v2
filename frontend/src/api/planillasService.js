import apiClient from './apiClient.js';
import { parseError } from "../utils/errorHandler.js";

const PLANILLAS_ENDPOINT = '/api/planillas';

/**
 * Descarga el PDF de la planilla generada
 * @param {Object} filtros - Objeto con (grupoId, tipoPlanilla, docenteId, periodo)
 */
export const descargarPlanillaPdf = async (filtros) => {
    try {
        const response = await apiClient.get(`${PLANILLAS_ENDPOINT}/pdf`, {
            params: filtros, // Pasamos el objeto completo a Axios
            responseType: 'blob', // Crítico para recibir archivos binarios
        });

        // Crear URL temporal y forzar la descarga en el navegador
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;

        // Formatear un nombre de archivo limpio y dinámico
        const fecha = new Date().toISOString().split('T')[0];

        // Si viene el flag modoMasivo, armamos el nombre pluralizado por tipo
        const nombreArchivo = filtros.modoMasivo
            ? `Planillas_${filtros.tipoPlanilla}_${fecha}.pdf`
            : `Planilla_${filtros.tipoPlanilla}_Grupo_${filtros.grupoId || ''}_${fecha}.pdf`;

        link.setAttribute('download', nombreArchivo);

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