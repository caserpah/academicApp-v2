import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faScaleBalanced, faToggleOn, faToggleOff } from "@fortawesome/free-solid-svg-icons";

import {
    fetchInitialData,
    crearJuicio,
    actualizarJuicio,
    eliminarJuicio,
} from "../../api/juiciosService.js";

import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";

import LoadingSpinner from "../common/LoadingSpinner.jsx";
import JuiciosForm from "./JuiciosForm.jsx";

const Juicios = () => {
    // Estado inicial del formulario
    const initialFormState = {
        id: null,
        tipo: '',
        grado: '',
        periodo: '',
        dimension: '',
        desempeno: '',
        minNota: '',
        maxNota: '',
        texto: '',
        activo: true,
        asignaturaId: '',
        vigenciaId: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [juicios, setJuicios] = useState([]);
    const [asignaturas, setAsignaturas] = useState([]);
    const [vigencia, setVigencia] = useState(null);
    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);

    const formContainerRef = useRef(null);

    /**
     * Cargar juicios y datos relacionados
     */
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const {
                juicios: fetchedJuicios,
                asignaturas: fetchedAsignaturas,
                vigencia: fetchedVigencia
            } = await fetchInitialData();

            setJuicios(fetchedJuicios || []);
            setAsignaturas(fetchedAsignaturas || []);
            setVigencia(fetchedVigencia || null);

            // Si hay vigencia, establecerla por defecto en el formulario
            if (fetchedVigencia?.id) {
                setFormData((prev) => ({
                    ...prev,
                    vigenciaId: fetchedVigencia.id,
                    tipo: '',
                    grado: '',
                    dimension: '',
                    desempeno: '',
                    activo: true
                }));
            }
        } catch (err) {
            console.error("Error cargando datos:", err);
            showError(err.message || "No se pudieron cargar los datos de juicios.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /**
     * Normaliza valores vacíos ("" → null)
     */
    const normalizeEmptyFields = (obj) => {
        const normalized = { ...obj };
        Object.keys(normalized).forEach((key) => {
            if (typeof normalized[key] === "string" && normalized[key].trim() === "") {
                normalized[key] = null;
            }
        });
        return normalized;
    };

    /**
     * Validación antes de enviar
     */
    const validateForm = () => {
        // Campos obligatorios
        const requiredFields = ['periodo', 'minNota', 'maxNota', 'texto', 'asignaturaId', 'vigenciaId'];

        for (const field of requiredFields) {
            if (!formData[field] && formData[field] !== 0) {
                return "Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.";
            }
        }

        // Validación numérica
        if (formData.minNota && formData.maxNota) {
            const min = parseFloat(formData.minNota);
            const max = parseFloat(formData.maxNota);

            if (isNaN(min) || isNaN(max)) {
                return "Las notas deben ser valores numéricos válidos.";
            }

            if (min < 0 || min > 10 || max < 0 || max > 10) {
                return "Las notas deben estar entre 0 y 10.";
            }

            if (min >= max) {
                return "La nota mínima debe ser menor que la nota máxima.";
            }
        }

        // Validación de período
        if (formData.periodo) {
            const periodo = parseInt(formData.periodo);
            if (isNaN(periodo) || periodo < 1 || periodo > 4) {
                return "El período debe ser un número entre 1 y 4.";
            }
        }

        return null;
    };

    /**
     * Enviar formulario
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationError = validateForm();
        if (validationError) {
            showWarning(validationError, "Validación requerida");
            return;
        }

        const dataToSubmit = normalizeEmptyFields(formData);

        try {
            setLoading(true);
            if (mode === "agregar") {
                const { id, ...dataToCreate } = dataToSubmit;
                const nuevoJuicio = await crearJuicio(dataToCreate);
                setJuicios((prev) => [...prev, nuevoJuicio]);
                showSuccess(`El juicio fue creado exitosamente.`);
            } else if (mode === "editar") {
                const { id, ...dataToUpdate } = dataToSubmit;
                if (!id) throw new Error("No se encontró el ID del juicio para editar.");

                const juicioActualizado = await actualizarJuicio(id, dataToUpdate);
                setJuicios((prev) =>
                    prev.map((j) => (j.id === id ? { ...j, ...juicioActualizado } : j))
                );
                showSuccess(`El juicio fue actualizado correctamente.`);
            }

            resetForm();
        } catch (err) {
            console.error("Error al guardar juicio:", err);
            showError(err.message || "Error al guardar los cambios del juicio.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cargar datos de un juicio en el formulario
     */
    const handleEdit = (juicio) => {
        setFormData({
            ...juicio,
            minNota: juicio.minNota || '',
            maxNota: juicio.maxNota || ''
        });
        setMode("editar");

        if (formContainerRef.current) {
            formContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    /**
     * Eliminar juicio con confirmación
     */
    const handleDelete = async (juicio) => {
        const confirmed = await showConfirm(
            `Va a eliminar el juicio para el período ${juicio.periodo} (Notas: ${juicio.minNota} - ${juicio.maxNota}).<br>Esta acción no se puede deshacer.`,
            "¿Eliminar juicio?"
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            await eliminarJuicio(juicio.id);
            setJuicios((prev) => prev.filter((j) => j.id !== juicio.id));
            showSuccess(`El juicio fue eliminado correctamente.`);
            if (formData.id === juicio.id) resetForm();
        } catch (err) {
            console.error("Error al eliminar juicio:", err);
            showError(err.message || "No se pudo eliminar el juicio.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Toggle para activar/desactivar juicio
     */
    const handleToggleActivo = async (juicio) => {
        const nuevoEstado = !juicio.activo;
        const accion = nuevoEstado ? "activar" : "desactivar";

        const confirmed = await showConfirm(
            `¿Está seguro que desea ${accion} el juicio para el período ${juicio.periodo}?`,
            `${nuevoEstado ? "Activar" : "Desactivar"} juicio`
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            const juicioActualizado = await actualizarJuicio(juicio.id, {
                ...juicio,
                activo: nuevoEstado
            });

            setJuicios((prev) =>
                prev.map((j) => (j.id === juicio.id ? { ...j, ...juicioActualizado } : j))
            );

            showSuccess(
                `El juicio ha sido ${nuevoEstado ? "activado" : "desactivado"} correctamente.`
            );
        } catch (err) {
            console.error("Error al cambiar estado del juicio:", err);
            showError(err.message || `No se pudo ${accion} el juicio.`);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Resetear formulario
     */
    const resetForm = () => {
        setFormData({
            ...initialFormState,
            vigenciaId: vigencia ? vigencia.id : '',
            tipo: '',
            grado: '',
            dimension: '',
            desempeno: '',
            activo: true
        });
        setMode("agregar");
    };

    /**
     * Obtener nombre de asignatura por ID
     */
    const getAsignaturaNombre = (id) => {
        const asignatura = asignaturas.find(a => a.id === id);
        return asignatura ? asignatura.nombre : 'N/A';
    };

    /**
     * Formatear fecha
     */
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // ===============================
    // Renderizado
    // ===============================
    if (loading && !juicios.length) {
        return <LoadingSpinner message="Cargando datos de juicios..." />;
    }

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">
                <h1 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">
                    <FontAwesomeIcon icon={faScaleBalanced} className="w-6 h-6 mr-3 text-[#2c3e50]" />
                    Gestión de Juicios
                </h1>

                <div ref={formContainerRef}>
                    <JuiciosForm
                        formData={formData}
                        setFormData={setFormData}
                        mode={mode}
                        loading={loading}
                        handleChange={(e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }))}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                        asignaturas={asignaturas}
                        vigencia={vigencia}
                    />
                </div>

                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 border-b pb-3">
                        Juicios registrados ({juicios.length})
                    </h2>

                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rango Notas</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desempeño</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignatura</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {juicios.length > 0 ? (
                                        juicios.map((juicio, index) => (
                                            <tr
                                                key={juicio.id}
                                                className={index % 2 === 0 ? "bg-white hover:bg-[#e6f7ff]" : "bg-[#f8f8f8] hover:bg-[#e6f7ff]"}
                                            >
                                                <td className="px-3 py-3 text-sm text-gray-700">#{juicio.id}</td>
                                                <td className="px-3 py-3 text-sm font-medium text-gray-900">{juicio.periodo}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">
                                                    {juicio.minNota} - {juicio.maxNota}
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-700">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        juicio.desempeno === 'BA' ? 'bg-yellow-100 text-yellow-800' :
                                                        juicio.desempeno === 'ME' ? 'bg-orange-100 text-orange-800' :
                                                        juicio.desempeno === 'EX' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {juicio.desempeno}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-700">
                                                    {getAsignaturaNombre(juicio.asignaturaId)}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <button
                                                        onClick={() => handleToggleActivo(juicio)}
                                                        className={`flex items-center space-x-2 px-3 py-1 rounded-full transition duration-150 ${
                                                            juicio.activo
                                                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                        }`}
                                                        title={juicio.activo ? "Click para desactivar" : "Click para activar"}
                                                        disabled={loading}
                                                    >
                                                        {juicio.activo ? (
                                                            <>
                                                                <FontAwesomeIcon icon={faToggleOn} className="text-green-600" />
                                                                <span className="text-xs font-medium">Activo</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <FontAwesomeIcon icon={faToggleOff} className="text-red-600" />
                                                                <span className="text-xs font-medium">Inactivo</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-500">
                                                    {formatDate(juicio.fechaCreacion)}
                                                </td>
                                                <td className="px-3 py-3 text-right text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(juicio)}
                                                        className="text-blue-600 hover:text-blue-800 p-1 rounded-full transition duration-150 hover:scale-[1.05]"
                                                        title="Editar"
                                                        disabled={loading}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} size="lg" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(juicio)}
                                                        className="text-red-600 hover:text-red-800 p-1 rounded-full transition duration-150"
                                                        title="Eliminar"
                                                        disabled={loading}
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-4 text-center text-gray-500 italic">
                                                No hay juicios registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Juicios;