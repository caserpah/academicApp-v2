import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faLayerGroup } from "@fortawesome/free-solid-svg-icons";

import {
    fetchInitialData,
    crearArea,
    actualizarArea,
    eliminarArea,
} from "../../api/areasService.js";

import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";

import LoadingSpinner from "../common/LoadingSpinner.jsx";
import AreasForm from "./AreasForm.jsx";

const Areas = () => {
    // Estado inicial del formulario
    const initialFormState = {
        id: null,
        codigo: "",
        nombre: "",
        abreviatura: "",
        promociona: true,
        vigenciaId: "",
    };

    const [formData, setFormData] = useState(initialFormState);
    const [areas, setAreas] = useState([]);
    const [vigencia, setVigencia] = useState(null);
    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);

    const formContainerRef = useRef(null);

    /**
     * Cargar áreas y vigencia activa
     */
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const { areas: fetchedAreas, vigencia: fetchedVigencia } = await fetchInitialData();
            setAreas(fetchedAreas || []);
            setVigencia(fetchedVigencia || null);

            if (fetchedVigencia?.id) {
                setFormData((prev) => ({ ...prev, vigenciaId: fetchedVigencia.id }));
            }
        } catch (err) {
            console.error("Error cargando datos:", err);
            showError(err.message || "No se pudieron cargar los datos de áreas o vigencia.");
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
        if (!formData.codigo || !formData.nombre || !formData.abreviatura || !formData.vigenciaId) {
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
                const nuevaArea = await crearArea(dataToCreate);
                setAreas((prev) => [...prev, nuevaArea]);
                showSuccess(`El área <b>${nuevaArea.nombre}</b> fue creada exitosamente.`);
            } else if (mode === "editar") {
                const { id, ...dataToUpdate } = dataToSubmit;
                if (!id) throw new Error("No se encontró el ID del área para editar.");

                const areaActualizada = await actualizarArea(id, dataToUpdate);
                setAreas((prev) =>
                    prev.map((a) => (a.id === id ? { ...a, ...areaActualizada } : a))
                );
                showSuccess(`El área <b>${areaActualizada.nombre}</b> fue actualizada correctamente.`);
            }

            resetForm();
        } catch (err) {
            console.error("Error al guardar área:", err);
            showError(err.message || "Error al guardar los cambios del área.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cargar datos de un área en el formulario
     */
    const handleEdit = (area) => {
        setFormData({
            ...area,
            abreviatura: area.abreviatura ?? "",
        });
        setMode("editar");

        if (formContainerRef.current) {
            formContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    /**
     * Eliminar área con confirmación
     */
    const handleDelete = async (area) => {
        const confirmed = await showConfirm(
            `Va a eliminar el área <b>${area.nombre}</b> (Código: ${area.codigo}).<br>Esta acción no se puede deshacer.`,
            "¿Eliminar área?"
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            await eliminarArea(area.id);
            setAreas((prev) => prev.filter((a) => a.id !== area.id));
            showSuccess(`El área <b>${area.nombre}</b> fue eliminada correctamente.`);
            if (formData.id === area.id) resetForm();
        } catch (err) {
            console.error("Error al eliminar área:", err);
            showError(err.message || "No se pudo eliminar el área.");
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

    // ===============================
    // Renderizado
    // ===============================
    if (loading && !areas.length) {
        return <LoadingSpinner message="Cargando datos de áreas..." />;
    }

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4">
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center mb-4 md:mb-0">
                        <FontAwesomeIcon icon={faLayerGroup} className="w-6 h-6 mr-3 text-[#2c3e50]" />
                        Gestión de Áreas Académicas
                    </h1>
                </div>

                <div ref={formContainerRef}>
                    <AreasForm
                        formData={formData}
                        setFormData={setFormData}
                        mode={mode}
                        loading={loading}
                        handleChange={(e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }))}
                        handleCheckboxChange={handleCheckboxChange}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                        vigencia={vigencia}
                    />
                </div>

                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 pb-3">
                        Áreas registradas ({areas.length})
                    </h2>

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
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promociona</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {areas.length > 0 ? (
                                        areas.map((area, index) => (
                                            <tr
                                                key={area.id}
                                                className={index % 2 === 0 ? "bg-white hover:bg-[#e6f7ff]" : "bg-[#f8f8f8] hover:bg-[#e6f7ff]"}
                                            >
                                                <td className="px-3 py-3 text-sm text-gray-700">{area.codigo}</td>
                                                <td className="px-3 py-3 text-sm font-medium text-gray-900">{area.nombre}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">{area.abreviatura}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${area.promociona ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {area.promociona ? 'Sí' : 'No'}
                                                    </span>
                                                </td>
                                                <button
                                                    onClick={() => handleEdit(area)}
                                                    className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition"
                                                    title="Editar"
                                                    disabled={loading}
                                                >
                                                    <FontAwesomeIcon icon={faEdit} size="lg" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(area)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition"
                                                    title="Eliminar"
                                                    disabled={loading}
                                                >
                                                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                                </button>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-4 text-center text-gray-500 italic">
                                                No hay áreas registradas.
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

export default Areas;