import apiClient from './apiClient.js';
import { parseError } from "../utils/errorHandler.js";

const CERTIFICADOS_ENDPOINT = '/api/certificados';

/**
 * Decodifica el encabezado Base64 UTF-8 X-Omitidos enviado por el servidor
 */
const decodificarHeaderOmitidos = (base64Str) => {
    if (!base64Str) return [];
    try {
        const binaryString = atob(base64Str);
        const bytes = Uint8Array.from(binaryString, char => char.charCodeAt(0));
        const decodedText = new TextDecoder("utf-8").decode(bytes);
        return JSON.parse(decodedText);
    } catch (e) {
        console.warn("No se pudo decodificar el listado de omitidos:", e);
        return [];
    }
};

/**
 * Extrae el nombre de archivo desde Content-Disposition o usa un fallback
 */
const extraerNombreArchivo = (contentDisposition, fallback) => {
    if (!contentDisposition) return fallback;
    const match = contentDisposition.match(/filename="?([^"]+)"?/i);
    return match && match[1] ? match[1] : fallback;
};

/**
 * Helper unificado para descargar PDFs en formato Blob y extraer errores JSON o metadatos masivos
 */
const ejecutarDescargaPdf = async (urlEndpoint, params, nombreFallback, mensajeErrorRed) => {
    try {
        const response = await apiClient.get(urlEndpoint, {
            params,
            responseType: 'blob',
        });

        const contentDisposition = response.headers['content-disposition'];
        const nombreArchivo = extraerNombreArchivo(contentDisposition, nombreFallback);

        const totalGeneradosHeader = response.headers['x-total-generados'];
        const omitidosHeader = response.headers['x-omitidos'];

        const totalGenerados = totalGeneradosHeader ? parseInt(totalGeneradosHeader, 10) : 1;
        const omitidos = decodificarHeaderOmitidos(omitidosHeader);

        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', nombreArchivo);
        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);

        return { totalGenerados, omitidos, nombreArchivo };
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
                    const customError = new Error(errorData.message);
                    customError.status = error.response.status;
                    if (Array.isArray(errorData.omitidos)) {
                        customError.omitidos = errorData.omitidos;
                    }
                    throw customError;
                }
            } catch (e) {
                if (e.message !== "Error desconocido al procesar la respuesta del servidor.") {
                    throw e;
                }
                console.error("No se pudo extraer el JSON del error:", e);
                throw new Error("Error desconocido al procesar la respuesta del servidor.");
            }
        }
        throw parseError(error, mensajeErrorRed);
    }
};

/**
 * Busca un estudiante por documento, nombres o apellidos, incluyendo su historial de matrículas
 */
export const buscarEstudianteConMatriculas = async (busqueda) => {
    try {
        const response = await apiClient.get(`${CERTIFICADOS_ENDPOINT}/buscar-estudiante/${encodeURIComponent(busqueda.trim())}`);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al buscar el estudiante.");
    }
};

/**
 * Descarga individual de Constancia de Matrícula (PDF)
 */
export const descargarCertificadoMatricula = async (config) => {
    const fecha = new Date().toISOString().split('T')[0];
    const nombreFallback = `Constancia_Matricula_${config.matriculaId}_${fecha}.pdf`;
    return await ejecutarDescargaPdf(
        `${CERTIFICADOS_ENDPOINT}/matricula`,
        config,
        nombreFallback,
        "Error de red al intentar generar la constancia de matrícula."
    );
};

/**
 * Descarga individual de Certificado de Estudios / Notas (PDF)
 */
export const descargarCertificadoNotas = async (config) => {
    const fecha = new Date().toISOString().split('T')[0];
    const textoPeriodo = parseInt(config.periodo, 10) === 5 ? "Final" : `P${config.periodo}`;
    const nombreFallback = `Certificado_Notas_${config.matriculaId}_${textoPeriodo}_${fecha}.pdf`;
    return await ejecutarDescargaPdf(
        `${CERTIFICADOS_ENDPOINT}/notas`,
        config,
        nombreFallback,
        "Error de red al intentar generar el certificado de notas."
    );
};

/**
 * Descarga masiva por grupo de Constancias de Matrícula (PDF único multipágina)
 */
export const descargarCertificadosMatriculaMasivo = async (config) => {
    const fecha = new Date().toISOString().split('T')[0];
    const nombreFallback = `Constancias_Matricula_Grupo_${config.grupoId}_${fecha}.pdf`;
    return await ejecutarDescargaPdf(
        `${CERTIFICADOS_ENDPOINT}/matricula/masivo`,
        config,
        nombreFallback,
        "Error de red al intentar generar las constancias de matrícula del grupo."
    );
};

/**
 * Descarga masiva por grupo de Certificados de Estudios / Notas (PDF único multipágina)
 */
export const descargarCertificadosNotasMasivo = async (config) => {
    const fecha = new Date().toISOString().split('T')[0];
    const textoPeriodo = parseInt(config.periodo, 10) === 5 ? "Final" : `P${config.periodo}`;
    const nombreFallback = `Certificados_Notas_Grupo_${config.grupoId}_${textoPeriodo}_${fecha}.pdf`;
    return await ejecutarDescargaPdf(
        `${CERTIFICADOS_ENDPOINT}/notas/masivo`,
        config,
        nombreFallback,
        "Error de red al intentar generar los certificados de notas del grupo."
    );
};