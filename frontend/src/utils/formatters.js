/**
 * Formatea la jornada para su visualización
 */
export const formatearJornada = (jornada) => {
    const mapa = {
        MANANA: "MAÑANA",
        TARDE: "TARDE",
        NOCHE: "NOCHE",
        UNICA: "ÚNICA"
    };

    return mapa[jornada] || jornada;
};