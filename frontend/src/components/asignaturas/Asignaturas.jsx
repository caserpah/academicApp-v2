import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEdit, faTrash, faBookOpen, faSearch, faSpinner,
    faChevronLeft, faChevronRight
} from "@fortawesome/free-solid-svg-icons";

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
        nombreCorto: "",
        abreviatura: "",
        porcentual: 0,
        areaId: "",
        vigenciaId: "",
    };

    const [formData, setFormData] = useState(initialFormState);
    const [asignaturas, setAsignaturas] = useState([]);
    const [areas, setAreas] = useState([]); // Catálogo para el select
    const [vigencia, setVigencia] = useState(null);

    // Paginación y Filtros Server-Side
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    // Búsqueda (Debounce)
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSearch, setActiveSearch] = useState("");

    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false); // Carga tabla

    const formContainerRef = useRef(null);

    // --- EFECTO DEBOUNCE ---
    // // Espera 500ms después de que el usuario deja de escribir para actualizar activeSearch
    useEffect(() => {
        const timer = setTimeout(() => {
            setActiveSearch(searchTerm);
            if (searchTerm !== activeSearch) {
                setPagination(prev => ({ ...prev, page: 1 })); // Reset a pág 1 si cambia la búsqueda
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, activeSearch]);

    /**
     * Cargar asignaturas, áreas y vigencia activa
     */
    const loadData = useCallback(async () => {
        try {
            setLoadingData(true);

            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: activeSearch
            };

            const response = await fetchInitialData(params);

            setAsignaturas(response.items || []);
            setAreas(response.areas || []); // Actualizamos catálogo áreas. Necesario para el formulario de crear/editar

            // Actualizar paginación
            if (response.pagination) {
                setPagination(prev => ({
                    ...prev,
                    total: response.pagination.total,
                    totalPages: response.pagination.totalPages
                }));
            }

            // Configurar vigencia
            if (response.vigencia) {
                setVigencia(response.vigencia);
                if (mode === 'agregar' && !formData.vigenciaId) {
                    setFormData(prev => ({ ...prev, vigenciaId: response.vigencia.id }));
                }
            }
        } catch (err) {
            console.error("Error cargando datos:", err);
            showError(err.message || "No se pudieron cargar los datos de asignaturas.");
        } finally {
            setLoadingData(false);
        }
    }, [pagination.page, pagination.limit, activeSearch, mode, formData.vigenciaId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // --- HANDLERS PAGINACIÓN ---
    const handleSearchInput = (e) => setSearchTerm(e.target.value);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

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
        if (!formData.codigo || !formData.nombre || !formData.nombreCorto || !formData.abreviatura || !formData.areaId || !formData.vigenciaId) {
            return "Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.";
        }

        if (formData.codigo.length > 6) {
            return "El código no puede tener más de 6 caracteres.";
        }

        if (formData.nombre.length > 60) {
            return "El nombre no puede tener más de 60 caracteres.";
        }

        if (formData.nombreCorto.length > 15) {
            return "El nombre corto no puede tener más de 15 caracteres.";
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

        try {
            setLoading(true);
            const data = normalizeEmptyFields(formData);
            if (mode === "agregar") {
                const { _id, ...rest } = data;
                await crearAsignatura(rest);
                showSuccess("Asignatura creada exitosamente.");
            } else if (mode === "editar") {
                await actualizarAsignatura(data.id, data);
                showSuccess("Asignatura actualizada exitosamente.");
            }
            loadData();
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
    const handleEdit = (item) => {
        setFormData({
            ...item,
            nombreCorto: item.nombreCorto ?? "",
            abreviatura: item.abreviatura ?? "",
            porcentual: item.porcentual ?? 0,
        });
        setMode("editar");
        formContainerRef.current?.scrollIntoView({ behavior: "smooth" });
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
            showSuccess(`Asignatura eliminada exitosamente.`);
            loadData();
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
     * Manejar cambio del input porcentual
     */
    const handlePorcentualChange = (e) => {
        const { name, value } = e.target;
        const numericValue = value === "" ? 0 : Math.min(100, Math.max(0, parseFloat(value) || 0));
        setFormData((prev) => ({ ...prev, [name]: numericValue }));
    };

    // Obtener nombre del área por ID
    const getAreaNombre = (id) => areas.find(a => a.id === id)?.nombre || "N/A";

    // ===============================
    // Renderizado
    // ===============================
    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <FontAwesomeIcon icon={faBookOpen} className="w-6 h-6 mr-3 text-blue-600" />
                    Gestión de Asignaturas
                </h1>

                <div ref={formContainerRef}>
                    <AsignaturasForm
                        formData={formData}
                        setFormData={setFormData}
                        mode={mode}
                        loading={loading}
                        handleChange={(e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))}
                        handlePorcentualChange={handlePorcentualChange}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                        areas={areas}
                        vigencia={vigencia}
                    />
                </div>

                {/* Tabla y Filtros */}
                <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">

                    {/* Header Tabla */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-semibold text-gray-700">
                            Asignaturas ({pagination.total})
                        </h2>

                        {/* Buscador Texto */}
                        <div className="relative w-full md:w-72">
                            <input
                                type="text"
                                placeholder="Buscar asignatura..."
                                value={searchTerm}
                                onChange={handleSearchInput}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                            />
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-2.5 text-gray-400 text-sm" />
                            {loadingData && (
                                <div className="absolute right-3 top-2.5">
                                    <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="overflow-x-auto min-h-[250px]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abreviatura</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Área</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peso (%)</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loadingData && asignaturas.length === 0 ? (
                                    <tr><td colSpan="6" className="py-10 text-center"><LoadingSpinner /></td></tr>
                                ) : asignaturas.length > 0 ? (
                                    asignaturas.map((asignatura, i) => (
                                        <tr key={asignatura.id} className={i % 2 === 0 ? "bg-white hover:bg-[#e6f7ff]" : "bg-[#f8f8f8] hover:bg-[#e6f7ff]"}>
                                            <td className="px-3 py-3 text-sm text-gray-700">{asignatura.codigo}</td>
                                            <td className="px-3 py-3 text-sm font-medium text-gray-900">{asignatura.nombre}</td>
                                            <td className="px-3 py-3 text-sm text-gray-700">{asignatura.abreviatura}</td>
                                            <td className="px-3 py-3 text-sm text-gray-700">{getAreaNombre(asignatura.areaId)}</td>
                                            <td className="px-3 py-3 text-sm text-gray-700 font-bold">{asignatura.porcentual}%</td>
                                            <td className="px-3 py-3 text-right space-x-2">
                                                <button onClick={() => handleEdit(asignatura)} className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50">
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button onClick={() => handleDelete(asignatura)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50">
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500 italic">
                                            {activeSearch
                                                ? `No se encontraron resultados para "${activeSearch}".`
                                                : "No hay asignaturas registradas."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Paginación */}
                    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6 mt-4">
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-700">
                                Página <span className="font-medium">{pagination.page}</span> de <span className="font-medium">{pagination.totalPages || 1}</span>
                            </p>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${pagination.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${pagination.page >= pagination.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
                                </button>
                            </nav>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Asignaturas;