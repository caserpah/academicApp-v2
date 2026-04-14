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
        // Manejo especial a prueba de balas para errores cuando responseType es 'blob'
        if (error.response && error.response.data) {
            try {
                let errorData = error.response.data;

                // Caso 1: Viene como archivo Blob puro (comportamiento por defecto de Axios)
                if (errorData instanceof Blob) {
                    const errorText = await errorData.text();
                    errorData = JSON.parse(errorText);
                }
                // Caso 2: Viene como cadena de texto JSON
                else if (typeof errorData === 'string') {
                    errorData = JSON.parse(errorData);
                }

                // Caso 3: Ya es un objeto (porque algún interceptor en apiClient lo parseó)
                // Si errorData ya es un objeto, extraemos el mensaje directamente
                if (errorData && errorData.message) {
                    throw new Error(errorData.message);
                }
            } catch (e) {
                // Si es un error propio que acabamos de lanzar arriba, lo dejamos pasar
                if (e.message !== "Error desconocido al procesar la respuesta del servidor.") {
                    throw e;
                }
                console.error("No se pudo extraer el JSON del error:", e);
                throw new Error("Error desconocido al procesar la respuesta del servidor.");
            }
        }

        // Si no hay respuesta del servidor (error de red), usamos tu parseError
        throw parseError(error, "Error de red al intentar generar el documento PDF.");
    }
};