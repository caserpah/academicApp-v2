import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";

/**
 * Servicio de gestión de Vigencias o Años Lectivos
 */

const VIGENCIAS_ENDPOINT = '/api/vigencias';

// Obtiene todas las vigencias o años lectivos
export const fetchVigencias = async () => {
    try {
        const response = await apiClient.get(VIGENCIAS_ENDPOINT);
        if (response.data.status !== 'success') throw new Error(response.data.message);
        return response.data.data.items || [];
    } catch (error) {
        throw parseError(error, 'Error al obtener vigencias.');
    }
};

export const crearVigencia = async (data) => {
    try {
        const response = await apiClient.post(VIGENCIAS_ENDPOINT, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al crear la vigencia");
    }
};

export const actualizarVigencia = async (id, data) => {
    try {
        const response = await apiClient.put(`${VIGENCIAS_ENDPOINT}/${id}`, data);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al actualizar la vigencia");
    }
};

export const eliminarVigencia = async (id, anio) => {
    try {
        const response = await apiClient.delete(`${VIGENCIAS_ENDPOINT}/${id}`, { params: { anio } });
        return response.data.message;
    } catch (error) {
        throw parseError(error, "Error al eliminar la vigencia");
    }
};

export const abrirVigencia = async (id) => {
    try {
        const response = await apiClient.post(`${VIGENCIAS_ENDPOINT}/${id}/abrir`);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al abrir la vigencia");
    }
};

export const cerrarVigencia = async (id) => {
    try {
        const response = await apiClient.post(`${VIGENCIAS_ENDPOINT}/${id}/cerrar`);
        return response.data.data;
    } catch (error) {
        throw parseError(error, "Error al cerrar la vigencia");
    }
};