import apiClient from './apiClient.js';
import { parseError } from "../utils/errorHandler.js";

const CERTIFICADOS_ENDPOINT = '/api/certificados';

/**
 * Busca un estudiante por documento, incluyendo su historial de matrículas
 * @param {string} documento - Número de documento del estudiante
 */
export const buscarEstudianteConMatriculas = async (documento) => {
    try {
        const response = await apiClient.get(`${CERTIFICADOS_ENDPOINT}/buscar-estudiante/${documento}`);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al buscar el estudiante.");
    }
};

/**
 * Descarga el PDF de la constancia de matrícula
 * @param {Object} config - { matriculaId, iniciaronClases, meses, comportamiento }
 */
export const descargarCertificadoMatricula = async (config) => {
    try {
        const response = await apiClient.get(`${CERTIFICADOS_ENDPOINT}/matricula`, {
            params: config,
            responseType: 'blob', // Crítico para recibir archivos binarios
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;

        const fecha = new Date().toISOString().split('T')[0];
        const nombreArchivo = `Constancia_Matricula_${config.matriculaId}_${fecha}.pdf`;

        link.setAttribute('download', nombreArchivo);
        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        // Manejo a prueba de balas para errores cuando responseType es 'blob'
        if (error.response && error.response.data) {
            try {
                let errorData = error.response.data;

                if (errorData instanceof Blob) {
                    const errorText = await errorData.text();
                    errorData = JSON.parse(errorText);
                } else if (typeof errorData === 'string') {
                    errorData = JSON.parse(errorData);
                }

                if (errorData && errorData.message) {
                    throw new Error(errorData.message);
                }
            } catch (e) {
                if (e.message !== "Error desconocido al procesar la respuesta del servidor.") {
                    throw e;
                }
                console.error("No se pudo extraer el JSON del error:", e);
                throw new Error("Error desconocido al procesar la respuesta del servidor.");
            }
        }
        throw parseError(error, "Error de red al intentar generar el certificado.");
    }
};

/**
 * Descarga el PDF del Certificado de Notas (Estudios)
 * @param {Object} config - { matriculaId, periodo }
 */
export const descargarCertificadoNotas = async (config) => {
    try {
        const response = await apiClient.get(`${CERTIFICADOS_ENDPOINT}/notas`, {
            params: config,
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;

        const fecha = new Date().toISOString().split('T')[0];
        const textoPeriodo = parseInt(config.periodo) === 5 ? "Final" : `P${config.periodo}`;
        const nombreArchivo = `Certificado_Notas_${config.matriculaId}_${textoPeriodo}_${fecha}.pdf`;

        link.setAttribute('download', nombreArchivo);
        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);

    } catch (error) {
        if (error.response && error.response.data) {
            try {
                let errorData = error.response.data;
                if (errorData instanceof Blob) {
                    const errorText = await errorData.text();
                    errorData = JSON.parse(errorText);
                } else if (typeof errorData === 'string') {
                    errorData = JSON.parse(errorData);
                }
                if (errorData && errorData.message) {
                    throw new Error(errorData.message);
                }
            } catch (e) {
                if (e.message !== "Error desconocido al procesar la respuesta del servidor.") throw e;
                throw new Error("Error desconocido al procesar la respuesta del servidor.");
            }
        }
        throw parseError(error, "Error de red al intentar generar el certificado de notas.");
    }
};