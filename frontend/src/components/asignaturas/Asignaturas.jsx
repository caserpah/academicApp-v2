import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faBookOpen } from "@fortawesome/free-solid-svg-icons";

import {
    fetchInitialData,
    crearAsignatura,
    actualizarAsignatura,
    eliminarAsignatura,
} from "../../api/asignaturaService.js";

import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";

import LoadingSpinner from "../common/LoadingSpinner.jsx";
import AsignaturasForm from "./AsignaturasForm.jsx";

const Asignaturas = () => {
    // Estado inicial del formulario
    const initialFormState = {
        id: null,
        codigo: "",
        nombre: "",
        abreviatura: "",
        porcentual: 0,
        promociona: true,
        areaId: "",
        vigenciaId: "",
    };

    const [formData, setFormData] = useState(initialFormState);
    const [asignaturas, setAsignaturas] = useState([]);
    const [areas, setAreas] = useState([]);
    const [vigencia, setVigencia] = useState(null);
    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);
    const [filterArea, setFilterArea] = useState("");

    const formContainerRef = useRef(null);

    /**
     * Cargar asignaturas, áreas y vigencia activa
     */
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const { asignaturas: fetchedAsignaturas, areas: fetchedAreas, vigencia: fetchedVigencia } = await fetchInitialData();
            setAsignaturas(fetchedAsignaturas || []);
            setAreas(fetchedAreas || []);
            setVigencia(fetchedVigencia || null);

            if (fetchedVigencia?.id) {
                setFormData((prev) => ({ ...prev, vigenciaId: fetchedVigencia.id }));
            }
        } catch (err) {
            console.error("Error cargando datos:", err);
            showError(err.message || "No se pudieron cargar los datos de asignaturas.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /**
     * Normaliza valores vacíos
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
        if (!formData.codigo || !formData.nombre || !formData.abreviatura || !formData.areaId || !formData.vigenciaId) {
            return "Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.";
        }

        if (formData.codigo.length > 6) {
            return "El código no puede tener más de 6 caracteres.";
        }

        if (formData.nombre.length > 60) {
            return "El nombre no puede tener más de 60 caracteres.";
        }

        if (formData.abreviatura.length > 6) {
            return "La abreviatura no puede tener más de 6 caracteres.";
        }

        if (formData.porcentual < 0 || formData.porcentual > 100) {
            return "El porcentual debe estar entre 0 y 100.";
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
                const nuevaAsignatura = await crearAsignatura(dataToCreate);
                setAsignaturas((prev) => [...prev, nuevaAsignatura]);
                showSuccess(`La asignatura <b>${nuevaAsignatura.nombre}</b> fue creada exitosamente.`);
            } else if (mode === "editar") {
                const { id, ...dataToUpdate } = dataToSubmit;
                if (!id) throw new Error("No se encontró el ID de la asignatura para editar.");

                const asignaturaActualizada = await actualizarAsignatura(id, dataToUpdate);
                setAsignaturas((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, ...asignaturaActualizada } : a))
                );
                showSuccess(`La asignatura <b>${asignaturaActualizada.nombre}</b> fue actualizada correctamente.`);
            }

            resetForm();
        } catch (err) {
            console.error("Error al guardar asignatura:", err);
            showError(err.message || "Error al guardar los cambios de la asignatura.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cargar datos de una asignatura en el formulario
     */
    const handleEdit = (asignatura) => {
        setFormData({
            ...asignatura,
            abreviatura: asignatura.abreviatura ?? "",
            porcentual: asignatura.porcentual ?? 0,
        });
        setMode("editar");

        if (formContainerRef.current) {
            formContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    /**
     * Eliminar asignatura con confirmación
     */
    const handleDelete = async (asignatura) => {
        const confirmed = await showConfirm(
            `Va a eliminar la asignatura <b>${asignatura.nombre}</b> (Código: ${asignatura.codigo}).<br>Esta acción no se puede deshacer.`,
            "¿Eliminar asignatura?"
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            await eliminarAsignatura(asignatura.id);
            setAsignaturas((prev) => prev.filter((a) => a.id !== asignatura.id));
            showSuccess(`La asignatura <b>${asignatura.nombre}</b> fue eliminada correctamente.`);
            if (formData.id === asignatura.id) resetForm();
        } catch (err) {
            console.error("Error al eliminar asignatura:", err);
            showError(err.message || "No se pudo eliminar la asignatura.");
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
            vigenciaId: vigencia ? vigencia.id : "",
        });
        setMode("agregar");
    };

    /**
     * Manejar cambio del checkbox promociona
     */
    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: checked }));
    };

    /**
     * Manejar cambio del input porcentual
     */
    const handlePorcentualChange = (e) => {
        const { name, value } = e.target;
        const numericValue = value === "" ? 0 : Math.min(100, Math.max(0, parseFloat(value) || 0));
        setFormData((prev) => ({ ...prev, [name]: numericValue }));
    };

    /**
     * Asignaturas filtradas por área seleccionada
     */
    const filteredAsignaturas = filterArea
        ? asignaturas.filter(asignatura => asignatura.areaId === parseInt(filterArea))
        : asignaturas;

    /**
     * Obtener nombre del área por ID
     */
    const getAreaNombre = (areaId) => {
        const area = areas.find(a => a.id === areaId);
        return area ? area.nombre : "N/A";
    };

    // ===============================
    // Renderizado
    // ===============================
    if (loading && !asignaturas.length) {
        return <LoadingSpinner message="Cargando datos de asignaturas..." />;
    }

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">
                <h1 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">
                    <FontAwesomeIcon icon={faBookOpen} className="w-6 h-6 mr-3 text-[#2c3e50]" />
                    Gestión de Asignaturas
                </h1>

                <div ref={formContainerRef}>
                    <AsignaturasForm
                        formData={formData}
                        setFormData={setFormData}
                        mode={mode}
                        loading={loading}
                        handleChange={(e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }))}
                        handlePorcentualChange={handlePorcentualChange}
                        handleCheckboxChange={handleCheckboxChange}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                        areas={areas}
                        vigencia={vigencia}
                    />
                </div>

                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700 border-b pb-3">
                            Asignaturas registradas ({filteredAsignaturas.length})
                        </h2>

                        {/* Filtro por área */}
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-600">Filtrar por área:</label>
                            <select
                                value={filterArea}
                                onChange={(e) => setFilterArea(e.target.value)}
                                className="border border-gray-300 rounded-lg p-2 text-sm"
                            >
                                <option value="">Todas las áreas</option>
                                {areas.map(area => (
                                    <option key={area.id} value={area.id}>
                                        {area.nombre} ({area.codigo})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abreviatura</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Porcentual</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promociona</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredAsignaturas.length > 0 ? (
                                        filteredAsignaturas.map((asignatura, index) => (
                                            <tr
                                                key={asignatura.id}
                                                className={index % 2 === 0 ? "bg-white hover:bg-[#e6f7ff]" : "bg-[#f8f8f8] hover:bg-[#e6f7ff]"}
                                            >
                                                <td className="px-3 py-3 text-sm text-gray-700">{asignatura.codigo}</td>
                                                <td className="px-3 py-3 text-sm font-medium text-gray-900">{asignatura.nombre}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">{asignatura.abreviatura}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">{getAreaNombre(asignatura.areaId)}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">
                                                    <span className="font-medium">{asignatura.porcentual}%</span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-700">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${asignatura.promociona ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {asignatura.promociona ? 'Sí' : 'No'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-right text-sm font-medium space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(asignatura)}
                                                        className="text-yellow-600 hover:text-yellow-800 p-1 rounded-full transition duration-150 hover:scale-[1.05]"
                                                        title="Editar"
                                                        disabled={loading}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} size="lg" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(asignatura)}
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
                                            <td colSpan="7" className="px-6 py-4 text-center text-gray-500 italic">
                                                No hay asignaturas registradas{filterArea ? " para esta área" : ""}.
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

export default Asignaturas;