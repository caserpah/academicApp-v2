import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrash, faBuilding } from "@fortawesome/free-solid-svg-icons";

import {
    fetchInitialData,
    crearSede,
    actualizarSede,
    eliminarSede,
} from "../../api/sedesService.js";

import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";

import LoadingSpinner from "../common/LoadingSpinner.jsx";
import SedesForm from "./SedesForm.jsx";

const Sedes = () => {
    // Estado inicial del formulario
    const initialFormState = {
        id: null,
        codigo: "",
        nombre: "",
        direccion: "",
        contacto: "",
        colegioId: "",
    };

    const [formData, setFormData] = useState(initialFormState);
    const [sedes, setSedes] = useState([]);
    const [colegio, setColegio] = useState(null);
    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);

    const formContainerRef = useRef(null);

    /**
     * Cargar sedes y colegio principal
     */
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const { sedes: fetchedSedes, colegio: fetchedColegio } = await fetchInitialData();
            setSedes(fetchedSedes || []);
            setColegio(fetchedColegio || null);

            if (fetchedColegio?.id) {
                setFormData((prev) => ({ ...prev, colegioId: fetchedColegio.id }));
            }
        } catch (err) {
            console.error("Error cargando datos:", err);
            showError(err.message || "No se pudieron cargar los datos de sedes o colegio.");
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
        if (!formData.codigo || !formData.nombre || !formData.direccion || !formData.colegioId) {
            return "Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.";
        }

        if (formData.contacto && !/^\d{10,12}$/.test(formData.contacto)) {
            return "El contacto debe tener entre 10 y 12 dígitos numéricos.";
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
                const nuevaSede = await crearSede(dataToCreate);
                setSedes((prev) => [...prev, nuevaSede]);
                showSuccess(`La sede <b>${nuevaSede.nombre}</b> fue creada exitosamente.`);
            } else if (mode === "editar") {
                const { id, ...dataToUpdate } = dataToSubmit;
                if (!id) throw new Error("No se encontró el ID de la sede para editar.");

                const sedeActualizada = await actualizarSede(id, dataToUpdate);
                setSedes((prev) =>
                    prev.map((s) => (s.id === id ? { ...s, ...sedeActualizada } : s))
                );
                showSuccess(`La sede <b>${sedeActualizada.nombre}</b> fue actualizada correctamente.`);
            }

            resetForm();
        } catch (err) {
            console.error("Error al guardar sede:", err);
            showError(err.message || "Error al guardar los cambios de la sede.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cargar datos de una sede en el formulario
     */
    const handleEdit = (sede) => {
        setFormData({
            ...sede,
            contacto: sede.contacto ?? "",
        });
        setMode("editar");

        // Desplazar al formulario al editar
        if (formContainerRef.current) {
            formContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    /**
     * Eliminar sede con confirmación
     */
    const handleDelete = async (sede) => {
        const confirmed = await showConfirm(
            `Va a eliminar la sede <b>${sede.nombre}</b> (Código: ${sede.codigo}).<br>Esta acción no se puede deshacer.`,
            "¿Eliminar sede?"
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            await eliminarSede(sede.id);
            setSedes((prev) => prev.filter((s) => s.id !== sede.id));
            showSuccess(`La sede <b>${sede.nombre}</b> fue eliminada correctamente.`);
            if (formData.id === sede.id) resetForm();
        } catch (err) {
            console.error("Error al eliminar sede:", err);
            showError(err.message || "No se pudo eliminar la sede.");
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
            colegioId: colegio ? colegio.id : "",
        });
        setMode("agregar");
    };

    // ===============================
    // Renderizado
    // ===============================
    if (loading && !sedes.length) {
        return <LoadingSpinner message="Cargando datos de sedes..." />;
    }

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <FontAwesomeIcon icon={faBuilding} className="mr-3 text-blue-600" />
                    Gestión de Sedes
                </h1>

                <div ref={formContainerRef}>
                    <SedesForm
                        formData={formData}
                        setFormData={setFormData}
                        mode={mode}
                        loading={loading}
                        handleChange={(e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }))}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                        colegio={colegio}
                    />
                </div>

                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 pb-3">
                        Sedes registradas ({sedes.length})
                    </h2>

                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sedes.length > 0 ? (
                                        sedes.map((sede, index) => (
                                            <tr
                                                key={sede.id}
                                                className={index % 2 === 0 ? "bg-white hover:bg-[#e6f7ff]" : "bg-[#f8f8f8] hover:bg-[#e6f7ff]"}
                                            >
                                                <td className="px-3 py-3 text-sm text-gray-700">{sede.codigo}</td>
                                                <td className="px-3 py-3 text-sm font-medium text-gray-900">{sede.nombre}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">{sede.direccion}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">{sede.contacto || "N/A"}</td>
                                                <td className="px-3 py-3 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleEdit(sede)}
                                                        className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition hover:scale-[1.05]"
                                                        title="Editar"
                                                        disabled={loading}
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} size="lg" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(sede)}
                                                        className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition"
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
                                            <td colSpan="5" className="px-6 py-4 text-center text-gray-500 italic">
                                                No hay sedes registradas.
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

export default Sedes;