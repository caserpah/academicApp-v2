import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEdit, faTrash, faLayerGroup,
    faSearch, faSpinner, faChevronLeft, faChevronRight
} from "@fortawesome/free-solid-svg-icons";

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

    // Búsqueda y Paginación
    const [searchTerm, setSearchTerm] = useState("");
    const [activeSearch, setActiveSearch] = useState("");

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    const [mode, setMode] = useState("agregar");

    // Carga del formulario y tabla
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);

    const formContainerRef = useRef(null);

    // --- EFECTO DEBOUNCE (BÚSQUEDA) ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setActiveSearch(searchTerm);
            setPagination(prev => ({ ...prev, page: 1 })); // Reset a página 1 al buscar
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    /**
     * Cargar áreas y vigencia activa
     */
    const loadData = useCallback(async () => {
        try {
            setLoadingData(true);

            const params = {
                page: pagination.page,
                limit: pagination.limit,
                search: activeSearch,
            };

            const response = await fetchInitialData(params);

            const listaAreas = response.items || response.areas || [];
            const datosPaginacion = response.pagination || {};
            const vigenciaActiva = response.vigencia || null;

            setAreas(listaAreas);

            if (datosPaginacion.total !== undefined) {
                setPagination(prev => ({
                    ...prev,
                    total: datosPaginacion.total,
                    totalPages: datosPaginacion.totalPages
                }));
            }

            if (vigenciaActiva) {
                setVigencia(vigenciaActiva);
                // Solo setear el ID si estamos agregando y no hay uno puesto
                if (mode === 'agregar' && !formData.vigenciaId) {
                    setFormData(prev => ({ ...prev, vigenciaId: vigenciaActiva.id }));
                }
            }

        } catch (err) {
            console.error("Error cargando datos:", err);
            showError(err.message || "No se pudieron cargar los datos.");
        } finally {
            setLoadingData(false);
        }
    }, [pagination.page, pagination.limit, activeSearch, mode, formData.vigenciaId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // --- HANDLERS PAGINACIÓN Y BÚSQUEDA ---
    const handleSearchInput = (e) => {
        setSearchTerm(e.target.value);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

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
                await crearArea(dataToCreate);
                showSuccess(`Área creada exitosamente.`);
            } else if (mode === "editar") {
                const { id, ...dataToUpdate } = dataToSubmit;
                if (!id) throw new Error("No se encontró el área seleccionada.");
                await actualizarArea(id, dataToUpdate);
                showSuccess(`Área actualizada correctamente.`);
            }
            loadData(); // Recargar tabla completa
            resetForm();
        } catch (err) {
            console.error(err);
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
        formContainerRef.current?.scrollIntoView({ behavior: "smooth" });
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
            showSuccess(`Área eliminada exitosamente.`);
            loadData(); // Recargar tabla
            if (formData.id === area.id) resetForm();
        } catch (err) {
            console.error(err);
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
    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <FontAwesomeIcon icon={faLayerGroup} className="w-6 h-6 mr-3 text-blue-600" />
                    Gestión de Áreas Académicas
                </h1>

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

                {/* TABLA Y FILTROS */}
                <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">

                    {/* Header Tabla: Título y Buscador */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-semibold text-gray-700">
                            Áreas registradas ({pagination.total})
                        </h2>

                        {/* Buscador */}
                        <div className="relative w-full md:w-72">
                            <input
                                type="text"
                                placeholder="Buscar código, nombre..."
                                value={searchTerm}
                                onChange={handleSearchInput}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                            />
                            <FontAwesomeIcon
                                icon={faSearch}
                                className="absolute left-3 top-2.5 text-gray-400 text-sm"
                            />
                            {loadingData && (
                                <div className="absolute right-3 top-2.5">
                                    <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="overflow-x-auto min-h-[200px]">
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
                                {loadingData && areas.length === 0 ? (
                                    <tr><td colSpan="5" className="py-10 text-center"><LoadingSpinner /></td></tr>
                                ) : areas.length > 0 ? (
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
                                            <td className="px-3 py-3 text-sm space-x-2">
                                                <button
                                                    onClick={() => handleEdit(area)}
                                                    className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition"
                                                    title="Editar"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} size="lg" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(area)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition"
                                                    title="Eliminar"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                                            {activeSearch
                                                ? `No se encontraron resultados para "${activeSearch}"`
                                                : "No hay áreas registradas."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN */}
                    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6 mt-4">
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Página <span className="font-medium">{pagination.page}</span> de <span className="font-medium">{pagination.totalPages || 1}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${pagination.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.totalPages}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${pagination.page >= pagination.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <span className="sr-only">Siguiente</span>
                                        <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Areas;