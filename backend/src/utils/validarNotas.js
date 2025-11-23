export function validarNotas({ minNota, maxNota, desempeno }) {

    // Saltar validación si NO se envió nada relacionado con notas o desempeño
    if (
        minNota === undefined &&
        maxNota === undefined &&
        (desempeno === undefined || desempeno === null || desempeno === "")
    ) {
        return true;
    }

    // --- 1. minNota y maxNota obligatorios si existe desempeño ---
    if (desempeno) {
        if (minNota === undefined || minNota === null) {
            throw new Error("Debe especificar la nota mínima para el rango de desempeño.");
        }
        if (maxNota === undefined || maxNota === null) {
            throw new Error("Debe especificar la nota máxima para el rango de desempeño.");
        }
    }

    // Convertir a número (si existen)
    const nMin = minNota !== undefined && minNota !== null ? parseFloat(minNota) : null;
    const nMax = maxNota !== undefined && maxNota !== null ? parseFloat(maxNota) : null;

    // --- 2. Validar rango general de notas ---
    if (nMin !== null && (isNaN(nMin) || nMin < 0 || nMin > 5)) {
        throw new Error("La nota mínima debe estar entre 0.00 y 5.00.");
    }

    if (nMax !== null && (isNaN(nMax) || nMax < 0 || nMax > 5)) {
        throw new Error("La nota máxima debe estar entre 0.00 y 5.00.");
    }

    // --- 3. Validar minNota ≤ maxNota ---
    if (nMin !== null && nMax !== null && nMin > nMax) {
        throw new Error("La nota mínima no puede ser mayor que la nota máxima.");
    }

    // --- 4. Validación específica según desempeño ---
    if (desempeno) {
        switch (desempeno.toUpperCase()) {

            case "BAJO":
                if (nMin < 1.00 || nMax > 2.99) {
                    throw new Error("La nota para un desempeño BAJO debe estar entre 1.00 y 2.99.");
                }
                break;

            case "BASICO":
                if (nMin < 3.00 || nMax > 3.99) {
                    throw new Error("La nota para un desempeño BÁSICO debe estar entre 3.00 y 3.99.");
                }
                break;

            case "ALTO":
                if (nMin < 4.00 || nMax > 4.59) {
                    throw new Error("La nota para un desempeño ALTO debe estar entre 4.00 y 4.59.");
                }
                break;

            case "SUPERIOR":
                if (nMin < 4.60 || nMax > 5.00) {
                    throw new Error("La nota para un desempeño SUPERIOR debe estar entre 4.60 y 5.00.");
                }
                break;

            default:
                throw new Error(
                    "El desempeño debe ser BAJO, BASICO, ALTO o SUPERIOR."
                );
        }
    }

    return true;
}