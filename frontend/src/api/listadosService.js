import apiClient from './apiClient.js';
import { parseError } from "../utils/errorHandler.js";

const LISTADOS_ENDPOINT = '/api/listados';

export const fetchListadosCatalogs = async () => {
    try {
        const response = await apiClient.get(`${LISTADOS_ENDPOINT}/filtros`);
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al cargar los catálogos de sedes y grupos.");
    }
};

export const generarListadoPdf = async (tipoListado, filtros) => {
    try {
        // Determinamos el endpoint final según el tipo seleccionado en el frontend
        let endpoint = `${LISTADOS_ENDPOINT}/${tipoListado}`;

        // Si es estudiantes, el backend espera el objeto filtros en string JSON
        const params = tipoListado === 'estudiantes'
            ? { vigenciaId: filtros.vigenciaId, filtros: JSON.stringify(filtros) }
            : filtros;

        const response = await apiClient.get(endpoint, {
            params,
            responseType: 'blob', // Crítico para recibir el PDF
        });

        // Crear el Blob con el tipo correcto
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);

        // Crear un elemento <a> invisible para forzar la descarga
        const link = document.createElement('a');
        link.href = url;

        // El atributo 'download' es clave para la descarga automática
        link.setAttribute('download', `Listado_${tipoListado}_${new Date().getTime()}.pdf`);

        // Añadir al documento, hacer clic y remover
        document.body.appendChild(link);
        link.click();

        // Limpieza inmediata después del clic
        document.body.removeChild(link);
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
        throw parseError(error, "Error de red al intentar generar el documento PDF.");
    }
};