import apiClient from "./apiClient.js";
import { parseError } from "../utils/errorHandler.js";

const BOLETINES_ENDPOINT = '/api/boletines';

/**
 * Carga los catálogos base (Sedes y Grados)
 */
export const fetchBoletinesCatalogs = async () => {
    try {
        const [sedesRes, gradosRes] = await Promise.all([
            apiClient.get('/api/sedes'),
            apiClient.get('/api/grados?limit=100')
        ]);
        return {
            sedes: sedesRes.data.data.items || sedesRes.data.data || [],
            grados: gradosRes.data.data || []
        };
    } catch (error) {
        console.error("Error cargando catálogos de boletines", error);
        throw parseError(error, "No se pudieron cargar los datos de sedes y grados.");
    }
};

/**
 * Busca estudiantes de un grupo específico (Para la impresión individual)
 */
export const fetchEstudiantesPorGrupo = async (grupoId) => {
    try {
        if (!grupoId) return [];
        const response = await apiClient.get(`/api/matriculas?grupoId=${grupoId}&limit=100`);
        return response.data.data.items || response.data.data || [];
    } catch (error) {
        console.error("Error buscando estudiantes", error);
        return [];
    }
};

/**
 * Genera y descarga el PDF del Boletín
 */
export const generarBoletinesPDF = async (payload) => {
    try {
        const response = await apiClient.post(`${BOLETINES_ENDPOINT}/generar-lote`, payload, {
            responseType: 'blob' // Indicamos que esperamos un archivo binario (PDF)
        });

        // Lógica del navegador para forzar la descarga del archivo recibido
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        // Limpiamos los nombres (asegúrate de mandar 'nombreGrado' y 'nombreGrupo' en el payload)
        const nombreSede = payload.nombreSede ? payload.nombreSede.replace(/\s+/g, '_').toUpperCase() : 'SEDE';
        const nombreGrado = payload.nombreGrado ? payload.nombreGrado.replace(/\s+/g, '_').toUpperCase() : 'GRADO';
        const nombreGrupo = payload.nombreGrupo ? payload.nombreGrupo.replace(/\s+/g, '_').toUpperCase() : payload.grupoId;

        // Limpiamos los datos del estudiante
        const docEst = payload.estudianteDoc ? payload.estudianteDoc.trim() : payload.estudianteId;
        const nomEst = payload.estudianteNombre ? payload.estudianteNombre.replace(/\s+/g, '_').toUpperCase() : 'ESTUDIANTE';
        const apeEst = payload.estudianteApellido ? payload.estudianteApellido.replace(/\s+/g, '_').toUpperCase() : '';

        // Armamos el nombre dinámico
        const nombreArchivo = payload.estudianteId
            ? `Boletin_${docEst}_${nomEst}_${apeEst}_P${payload.periodoActual}.pdf`.replace(/_+/g, '_')
            : `Boletines_${nombreSede}_${nombreGrado}${nombreGrupo}_P${payload.periodoActual}.pdf`;

        // 3. Descargamos el archivo
        link.setAttribute('download', nombreArchivo);
        document.body.appendChild(link);
        link.click();

        // Limpieza
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        // Como pedimos un blob, si hay un error del servidor (JSON), debemos leerlo
        if (error.response && error.response.data instanceof Blob) {
            const errorText = await error.response.data.text();
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || errorJson.msg || "Error al generar los boletines");
        }
        throw parseError(error, "Error de conexión al generar el PDF.");
    }
};

/**
 * Audita las notas faltantes de un grupo antes de generar el boletín
 */
export const fetchAuditoriaBoletines = async (grupoId, periodoActual) => {
    try {
        const response = await apiClient.get(`${BOLETINES_ENDPOINT}/auditoria`, {
            params: { grupoId, periodoActual }
        });

        // Retornamos directamente el arreglo con los datos del reporte
        return response.data.data;
    } catch (error) {
        console.error("Error al auditar boletines:", error);
        throw parseError(error, "Ocurrió un error al auditar las calificaciones.");
    }
};

/**
 * Descarga el PDF del boletín usando el código público del acudiente.
 * Al ser un endpoint público, devolverá el PDF o un JSON con el error.
 */
export const descargarBoletinPorCodigo = async (codigo) => {
    try {
        const response = await apiClient.get(`/api/codigos-boletines/publico/${codigo}`, {
            responseType: 'blob' // Esperamos el PDF
        });

        // Convertimos la respuesta en un archivo PDF
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);

        // Lo abrimos en una nueva pestaña (Ideal para celulares y PC)
        window.open(url, '_blank');

        // Limpiamos la URL temporal de la memoria después de unos segundos
        setTimeout(() => window.URL.revokeObjectURL(url), 2000);

        return true;
    } catch (error) {
        // Si el backend devuelve un error (ej. 404 Código Inválido),
        // como pedimos un 'blob', debemos leerlo como texto para extraer el JSON
        if (error.response && error.response.data instanceof Blob) {
            const errorText = await error.response.data.text();
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.message || "Código inválido o expirado.");
        }
        throw parseError(error, "Error de conexión al descargar el boletín.");
    }
};

/**
 * Obtiene la lista de códigos generados para un grupo y periodo.
 */
export const fetchCodigosPorGrupo = async (grupoId, periodo, busqueda = "") => {
    try {
        const response = await apiClient.get(`/api/codigos-boletines/grupo/${grupoId}/periodo/${periodo}`, {
            params: { busqueda }
        });

        // Retornamos el arreglo de códigos o un arreglo vacío si no hay datos
        return response.data || [];
    } catch (error) {
        throw parseError(error, "Error al obtener los códigos del grupo.");
    }
};

/**
 * Cambia el estado de un código (Botón de pánico: Activo / Inactivo)
 */
export const toggleEstadoCodigo = async (codigoId, nuevoEstado) => {
    try {
        const response = await apiClient.patch(`/api/codigos-boletines/${codigoId}/estado`, { activo: nuevoEstado });
        return response.data;
    } catch (error) {
        throw parseError(error, "Error al actualizar el estado del código.");
    }
};