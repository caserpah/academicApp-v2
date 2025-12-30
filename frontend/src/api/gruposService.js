import apiClient from "./apiClient.js";

const GRUPOS_ENDPOINT = "/api/grupos";

/**
 * Obtener grupos por sede y vigencia activa
 */
export const fetchGruposPorSede = async (sedeId) => {
    try {
        const response = await apiClient.get(GRUPOS_ENDPOINT, {
            params: {
                sedeId,
                includeGrado: true,
                soloActivos: true
            }
        });

        const apiData = response.data;

        if (apiData.status !== "success") {
            throw new Error(apiData.message || "Error al obtener grupos");
        }

        return apiData.data.items || [];

    } catch (error) {
        throw new Error(
            error.response?.data?.message ||
            error.message ||
            "Error al obtener grupos"
        );
    }
};