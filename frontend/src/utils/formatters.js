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

/**
 * Formatea el nombre de un grupo para su visualización
 */
export const formatearNombreGrupo = (texto) => {
    if (!texto) return "";

    // 1. Separamos el grado/grupo de la jornada usando el "|"
    const partes = texto.split('|');

    // 2. Limpiamos y formateamos solo la primera parte (Ej: "PRE_JARDIN A ")
    let nombreGrupo = partes[0]
        .trim()
        .replace(/_/g, " ") // Quita guiones bajos
        .toUpperCase() // Asegura mayúsculas
        .replace(/\s+([^\s]+)$/, " - $1"); // Pone el guión antes de la letra del grupo

    // 3. Si existe una segunda parte (la jornada), la volvemos a unir con el "|"
    if (partes.length > 1) {
        const jornada = partes[1].trim();
        return `${nombreGrupo} | ${jornada}`;
    }

    // Si no había jornada, retornamos solo el grupo
    return nombreGrupo;
};