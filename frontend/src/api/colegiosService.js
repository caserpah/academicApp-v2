import apiClient from './apiClient.js';
import { parseError } from "../utils/errorHandler.js";

/**
 * Servicio de gestión de Colegios
 * --------------------------------
 * Contiene las funciones para obtener y actualizar la información
 * del colegio principal mediante la API REST.
 */

// Definimos la URL especifica colegios
const COLEGIOS_ENDPOINT = '/api/colegios';

/* -------------------------------------------------------------------------- */
/* Funciones principales del servicio                                      */
/* -------------------------------------------------------------------------- */

// Obtiene el primer colegio (o el objeto directo, según la API)
export const fetchColegio = async () => {
    try {
        const response = await apiClient.get(COLEGIOS_ENDPOINT);
        const apiData = response.data;

        if (apiData.status !== "success" || !apiData.data) {
            throw new Error(apiData.message || "Respuesta del servidor inválida.");
        }

        const items = apiData.data.items;

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error("No existen colegios registrados.");
        }

        const colegio = items[0];

        return { colegio };

    } catch (error) {
        console.error("Error en fetchColegio:", error);
        throw parseError(error, "Error al obtener los datos iniciales.");
    }
};

// Actualiza la información del colegio por ID
export const actualizarColegio = async (id, colegioData) => {
    try {
        const response = await apiClient.put(`${COLEGIOS_ENDPOINT}/${id}`, colegioData);
        const apiData = response.data;

        if (apiData.status !== "success") {
            throw new Error(apiData.message || "Error al actualizar el colegio.");
        }

        // Devuelve solo la parte útil
        return apiData.data || apiData;

    } catch (error) {
        throw parseError(error, "Error al actualizar el colegio.");
    }
};