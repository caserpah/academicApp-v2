import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEdit,
    faTrash,
    faUserTie,
    faBuilding,
    faCalendarDay
} from "@fortawesome/free-solid-svg-icons";

import {
    fetchCoordinadores,
    crearCoordinador,
    actualizarCoordinador,
    eliminarCoordinador,
    fetchSedes,
    asignarSedeCoordinador
} from "../../api/coordinadoresService.js";

import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";

import LoadingSpinner from "../common/LoadingSpinner.jsx";
import CoordinadoresForm from "./CoordinadoresForm.jsx";
import AsignarSedeModal from "./AsignarSedeModal.jsx";

const Coordinadores = () => {
    // Estado inicial del formulario
    const initialFormState = {
        id: null,
        numeroDocumento: "",
        nombres: "",
        email: "",
        contacto: "",
        direccion: ""
    };

    const [formData, setFormData] = useState(initialFormState);
    const [coordinadores, setCoordinadores] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);
    const [showAsignarModal, setShowAsignarModal] = useState(false);
    const [selectedCoordinador, setSelectedCoordinador] = useState(null);

    const formContainerRef = useRef(null);

    /**
     * Cargar coordinadores y sedes
     */
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const { coordinadores: fetchedCoordinadores, sedes: fetchedSedes } = await fetchCoordinadores();
            setCoordinadores(fetchedCoordinadores || []);
            setSedes(fetchedSedes || []);
        } catch (err) {
            console.error("Error cargando datos:", err);
            showError(err.message || "No se pudieron cargar los datos de coordinadores.");
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
        if (!formData.numeroDocumento || !formData.nombres || !formData.email) {
            return "Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.";
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            return "Ingrese un email válido.";
        }

        // Validar contacto si está presente
        if (formData.contacto && !/^\d{10,12}$/.test(formData.contacto)) {
            return "El contacto debe tener entre 10 y 12 dígitos numéricos (opcional).";
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
                const nuevoCoordinador = await crearCoordinador(dataToCreate);
                setCoordinadores((prev) => [...prev, nuevoCoordinador]);
                showSuccess(`El coordinador <b>${nuevoCoordinador.nombres}</b> fue creado exitosamente.`);
            } else if (mode === "editar") {
                const { id, ...dataToUpdate } = dataToSubmit;
                if (!id) throw new Error("No se encontró el ID del coordinador para editar.");

                const coordinadorActualizado = await actualizarCoordinador(id, dataToUpdate);
                setCoordinadores((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, ...coordinadorActualizado } : c))
                );
                showSuccess(`El coordinador <b>${coordinadorActualizado.nombres}</b> fue actualizado correctamente.`);
            }

            resetForm();
        } catch (err) {
            console.error("Error al guardar coordinador:", err);
            showError(err.message || "Error al guardar los cambios del coordinador.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Cargar datos de un coordinador en el formulario
     */
    const handleEdit = (coordinador) => {
        setFormData({
            ...coordinador,
            contacto: coordinador.contacto ?? "",
            direccion: coordinador.direccion ?? ""
        });
        setMode("editar");

        // Desplazar al formulario al editar
        if (formContainerRef.current) {
            formContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    /**
     * Eliminar coordinador con confirmación
     */
    const handleDelete = async (coordinador) => {
        const confirmed = await showConfirm(
            `Va a eliminar al coordinador <b>${coordinador.nombres}</b> (Documento: ${coordinador.numeroDocumento}).<br>Esta acción no se puede deshacer.`,
            "¿Eliminar coordinador?"
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            await eliminarCoordinador(coordinador.id);
            setCoordinadores((prev) => prev.filter((c) => c.id !== coordinador.id));
            showSuccess(`El coordinador <b>${coordinador.nombres}</b> fue eliminado correctamente.`);
            if (formData.id === coordinador.id) resetForm();
        } catch (err) {
            console.error("Error al eliminar coordinador:", err);
            showError(err.message || "No se pudo eliminar el coordinador.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Abrir modal para asignar sede
     */
    const handleAsignarSede = (coordinador) => {
        setSelectedCoordinador(coordinador);
        setShowAsignarModal(true);
    };

    /**
     * Asignar sede al coordinador
     */
    const handleAsignarSedeSubmit = async (sedeData) => {
        try {
            setLoading(true);
            await asignarSedeCoordinador(selectedCoordinador.id, sedeData);
            showSuccess(`Sede asignada exitosamente al coordinador <b>${selectedCoordinador.nombres}</b>.`);
            setShowAsignarModal(false);

            // Recargar datos para actualizar la lista
            const { coordinadores: updatedCoordinadores } = await fetchCoordinadores();
            setCoordinadores(updatedCoordinadores || []);
        } catch (err) {
            console.error("Error al asignar sede:", err);
            showError(err.message || "No se pudo asignar la sede al coordinador.");
        } finally {
            setLoading(false);
        }
    };

    /**
     * Resetear formulario
     */
    const resetForm = () => {
        setFormData(initialFormState);
        setMode("agregar");
    };

    /**
     * Obtener sedes asignadas al coordinador
     */
    const getSedesAsignadas = (coordinadorId) => {
        // Esto debería venir de la API, pero por ahora simulamos
        const coordinador = coordinadores.find(c => c.id === coordinadorId);
        return coordinador?.sedesAsignadas || [];
    };

    // ===============================
    // Renderizado
    // ===============================
    if (loading && !coordinadores.length) {
        return <LoadingSpinner message="Cargando datos de coordinadores..." />;
    }

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4">
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center mb-4 md:mb-0">
                        <FontAwesomeIcon icon={faUserTie} className="w-6 h-6 mr-3 text-[#2c3e50]" />
                        Gestión de Coordinadores
                    </h1>
                </div>

                <div ref={formContainerRef}>
                    <CoordinadoresForm
                        formData={formData}
                        setFormData={setFormData}
                        mode={mode}
                        loading={loading}
                        handleChange={(e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }))}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                    />
                </div>

                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 pb-3">
                        Coordinadores registrados ({coordinadores.length})
                    </h2>

                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombres</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sedes</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {coordinadores.length > 0 ? (
                                        coordinadores.map((coordinador, index) => {
                                            const sedesAsignadas = getSedesAsignadas(coordinador.id);
                                            return (
                                                <tr
                                                    key={coordinador.id}
                                                    className={index % 2 === 0 ? "bg-white hover:bg-[#e6f7ff]" : "bg-[#f8f8f8] hover:bg-[#e6f7ff]"}
                                                >
                                                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{coordinador.numeroDocumento}</td>
                                                    <td className="px-3 py-3 text-sm text-gray-700">{coordinador.nombres}</td>
                                                    <td className="px-3 py-3 text-sm text-gray-700">{coordinador.email}</td>
                                                    <td className="px-3 py-3 text-sm text-gray-700">{coordinador.contacto || "N/A"}</td>
                                                    <td className="px-3 py-3 text-sm text-gray-700">{coordinador.direccion || "N/A"}</td>
                                                    <td className="px-3 py-3 text-sm text-gray-700">
                                                        {sedesAsignadas.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {sedesAsignadas.slice(0, 2).map(sede => (
                                                                    <span key={sede.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                                        {sede.codigo}
                                                                    </span>
                                                                ))}
                                                                {sedesAsignadas.length > 2 && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                                        +{sedesAsignadas.length - 2}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 italic">Sin asignar</span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-3 text-right space-x-2">
                                                        <button
                                                            onClick={() => handleAsignarSede(coordinador)}
                                                            className="text-purple-600 hover:text-purple-800 p-1 rounded-full transition duration-150 hover:scale-[1.05] group relative"
                                                            title="Asignar Sedes"
                                                            disabled={loading}
                                                        >
                                                            <FontAwesomeIcon icon={faBuilding} size="lg" />
                                                            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                                Asignar Sedes
                                                            </span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(coordinador)}
                                                            className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition"
                                                            title="Editar"
                                                            disabled={loading}
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} size="lg" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(coordinador)}
                                                            className="text-red-600 hover:text-red-800 p-1 rounded-full transition duration-150"
                                                            title="Eliminar"
                                                            disabled={loading}
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-4 text-center text-gray-500 italic">
                                                No hay coordinadores registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal para asignar sedes */}
                {showAsignarModal && selectedCoordinador && (
                    <AsignarSedeModal
                        coordinador={selectedCoordinador}
                        sedes={sedes}
                        onClose={() => setShowAsignarModal(false)}
                        onSubmit={handleAsignarSedeSubmit}
                        loading={loading}
                    />
                )}
            </div>
        </div>
    );
};

export default Coordinadores;