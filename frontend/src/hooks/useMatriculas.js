import { useState, useCallback } from "react";
import {
    listarMatriculas,
    crearMatricula,
    actualizarMatricula,
    crearMatriculaMasiva,
    obtenerMatricula
} from "../api/matriculasService";

export const useMatriculas = () => {
    const [matriculas, setMatriculas] = useState([]);
    const [paginacion, setPaginacion] = useState({ page: 1, limit: 20, total: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /**
     * Cargar listado de matrículas
     */
    const cargarMatriculas = useCallback(async (filtros = {}) => {
        setLoading(true);
        setError(null);
        try {
            // Llamamos al servicio
            const respuesta = await listarMatriculas(filtros);
            console.log("📥 Hook: Respuesta recibida:", respuesta);

            const items = respuesta.items || respuesta.data || [];
            // Si el backend no envía total, usamos la longitud del array
            const total = respuesta.total || items.length || 0;

            // Extraemos totalPages (o lo calculamos como fallback si fallara)
            const totalPages = respuesta.totalPages || Math.ceil(total / (filtros.limit || 20)) || 1;

            setMatriculas(items);

            // Actualizamos paginación preservando página y limit
            setPaginacion(prev => ({
                ...prev,
                total,
                page: filtros.page || prev.page,
                totalPages: totalPages
            }));

        } catch (err) {
            console.error("❌ Hook: Error al cargar:", err);
            setError(err.message);
            setMatriculas([]);
        } finally {
            console.log("🏁 Hook: Finalizando carga (loading -> false)");
            setLoading(false);
        }
    }, []);

    /**
     * Obtener una sola matrícula (para edición)
     */
    const getMatriculaById = useCallback(async (id) => {
        setLoading(true);
        try {
            const data = await obtenerMatricula(id);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Crear una nueva matrícula
     */
    const registrarMatricula = useCallback(async (datos) => {
        setLoading(true);
        try {
            const nueva = await crearMatricula(datos);
            return nueva;
        } catch (err) {
            setError(err.message);
            throw err; // Re-lanzamos para que el formulario muestre la alerta
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Actualizar matrícula existente
     */
    const editarMatricula = useCallback(async (id, datos) => {
        setLoading(true);
        try {
            const actualizada = await actualizarMatricula(id, datos);

            // Actualización optimista en el estado local (evita recargar toda la tabla)
            setMatriculas((prev) =>
                prev.map((m) => (m.id === id ? { ...m, ...actualizada } : m))
            );

            return actualizada;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Procesar Matrícula Masiva
     */
    const procesarMasivo = useCallback(async (payload) => {
        setLoading(true);
        try {
            const resultado = await crearMatriculaMasiva(payload);
            return resultado;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        // Estado
        matriculas,
        paginacion,
        loading,
        error,

        // Acciones
        cargarMatriculas,
        getMatriculaById,
        registrarMatricula,
        editarMatricula,
        procesarMasivo,

        // Helper para limpiar errores manualmente si es necesario
        limpiarError: () => setError(null)
    };
};