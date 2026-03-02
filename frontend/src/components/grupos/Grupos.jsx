import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUsersRectangle, faEdit, faTrash, faSearch, faSpinner,
    faEraser, faChevronLeft, faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import {
    fetchInitialData,
    crearGrupo,
    actualizarGrupo,
    eliminarGrupo
} from "../../api/gruposService.js";

import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import GruposForm from "./GruposForm.jsx";

// Función auxiliar para limpiar los datos del formulario, convirtiendo cadenas vacías a null
const cleanData = (data) => {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === "") cleaned[key] = null;
    });
    return cleaned;
};

const Grupos = () => {
    // --- ESTADOS INICIALES ---
    const initialFormState = {
        id: null,
        nombre: "",
        gradoId: "",
        jornada: "",
        cupos: 45,
        sobrecupoPermitido: false,
        sedeId: "",
        directorId: ""
    };

    const [formData, setFormData] = useState(initialFormState);
    const [grupos, setGrupos] = useState([]);
    const [vigenciaActual, setVigenciaActual] = useState(null);

    // Catálogos
    const [catalogos, setCatalogos] = useState({
        grados: [],
        sedes: [],
        docentes: []
    });

    // Filtros Estructurados
    const [filters, setFilters] = useState({
        sedeId: "",
        gradoId: "",
        jornada: ""
    });

    // Búsqueda y Paginación
    const [searchTerm, setSearchTerm] = useState("");      // Input del usuario
    const [activeSearch, setActiveSearch] = useState("");  // Valor enviado a API (con delay)

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);      // Carga de formulario/acciones
    const [loadingData, setLoadingData] = useState(false); // Carga de tabla
    const formContainerRef = useRef(null);

    // --- EFECTO DEBOUNCE (BÚSQUEDA) ---
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            setActiveSearch(searchTerm);
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // --- CARGA DE DATOS ---
    const loadData = useCallback(async () => {
        try {
            setLoadingData(true);

            // Mapeamos los filtros para el servicio
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                nombre: activeSearch, // El backend espera 'nombre' para buscar
                ...filters
            };

            const data = await fetchInitialData(params);

            setGrupos(data.grupos || []);

            // Actualizar paginación si viene del backend
            if (data.paginacion) {
                setPagination(prev => ({
                    ...prev,
                    total: data.paginacion.total,
                    totalPages: data.paginacion.totalPages
                }));
            }

            // Cargar catálogos solo si están vacíos (primera carga)
            if (catalogos.sedes.length === 0 && data.catalogos) {
                setCatalogos(data.catalogos);
            }
            // Cargar vigencia actual
            if (data.vigencia) {
                setVigenciaActual(data.vigencia);
            }

        } catch (err) {
            console.error(err);
            showError("No se pudieron cargar los datos de grupos.");
        } finally {
            setLoadingData(false);
        }
    }, [pagination.page, pagination.limit, activeSearch, filters, catalogos.sedes.length]);

    // Efecto principal de carga
    useEffect(() => {
        loadData();
    }, [loadData]);


    // --- HANDLERS FILTROS ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, page: 1 })); // Resetear página
    };

    const clearFilters = () => {
        setFilters({ sedeId: "", gradoId: "", jornada: "" });
        setSearchTerm("");
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSearchInput = (e) => {
        setSearchTerm(e.target.value);
    };

    // --- HANDLERS PAGINACIÓN ---
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    // --- HANDLERS FORMULARIO ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones básicas front
        if (!formData.nombre || !formData.gradoId || !formData.sedeId || !formData.jornada) {
            showWarning("Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.");
            return;
        }

        try {
            setLoading(true);
            if (mode === "agregar") {
                await crearGrupo(cleanData(formData));
                showSuccess(`Grupo creado exitosamente.`);
            } else {
                await actualizarGrupo(formData.id, cleanData(formData));
                showSuccess(`Grupo actualizado exitosamente.`);
            }
            loadData(); // Recargar tabla
            resetForm();
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (grupo) => {
        setFormData({
            id: grupo.id,
            nombre: grupo.nombre,
            gradoId: grupo.gradoId,
            jornada: grupo.jornada,
            cupos: grupo.cupos,
            sobrecupoPermitido: grupo.sobrecupoPermitido,
            sedeId: grupo.sedeId,
            directorId: grupo.directorId || ""
        });
        setMode("editar");
        // Scroll suave hacia el formulario
        formContainerRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleDelete = async (grupo) => {
        const confirm = await showConfirm("Esta acción eliminará permanentemente al grupo y sus datos asociados.", "¿Eliminar grupo?");
        if (!confirm) return;

        try {
            setLoading(true);
            await eliminarGrupo(grupo.id);
            showSuccess("Grupo eliminado exitosamente.");
            loadData();
            if (formData.id === grupo.id) resetForm();
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(initialFormState);
        setMode("agregar");
    };

    // --- RENDERIZADO ---
    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Principal */}
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <FontAwesomeIcon icon={faUsersRectangle} className="w-6 h-6 mr-3 text-blue-600" />
                    Gestión de Grupos Académicos
                </h1>

                {/* Formulario */}
                <div ref={formContainerRef}>
                    <GruposForm
                        formData={formData}
                        mode={mode}
                        loading={loading}
                        handleChange={handleChange}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                        catalogos={catalogos}
                        vigencia={vigenciaActual}
                    />
                </div>

                {/* --- SECCIÓN DE FILTROS Y TABLA --- */}
                <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">

                    {/* Header: Título y Buscador Global */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-semibold text-gray-700">
                            Grupos registrados ({pagination.total})
                        </h2>

                        {/* Buscador de Texto */}
                        <div className="relative w-full md:w-72">
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
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

                    {/* --- BARRA DE FILTROS DESPLEGABLES --- */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">

                        {/* Filtro Sede */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-500 mb-1 ml-1">Sede</label>
                            <select
                                name="sedeId"
                                value={filters.sedeId}
                                onChange={handleFilterChange}
                                className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                            >
                                <option value="">Todas las Sedes</option>
                                {catalogos.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>

                        {/* Filtro Grado */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-500 mb-1 ml-1">Grado</label>
                            <select
                                name="gradoId"
                                value={filters.gradoId}
                                onChange={handleFilterChange}
                                className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                            >
                                <option value="">Todos los Grados</option>
                                {catalogos.grados.map(g => <option key={g.id} value={g.id}>{g.nombre.replace(/_/g, " ")}</option>)}
                            </select>
                        </div>

                        {/* Filtro Jornada */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-500 mb-1 ml-1">Jornada</label>
                            <select
                                name="jornada"
                                value={filters.jornada}
                                onChange={handleFilterChange}
                                className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                            >
                                <option value="">Todas</option>
                                <option value="MANANA">Mañana</option>
                                <option value="TARDE">Tarde</option>
                                <option value="NOCHE">Noche</option>
                                <option value="COMPLETA">Completa</option>
                            </select>
                        </div>

                        {/* Botón Limpiar */}
                        <div className="flex flex-col justify-end">
                            <button
                                onClick={clearFilters}
                                className="bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-blue-600 px-4 py-2 rounded-md text-sm transition flex items-center justify-center gap-2"
                                title="Limpiar todos los filtros"
                            >
                                <FontAwesomeIcon icon={faEraser} />
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grado</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sede</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jornada</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Director</th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cupos</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loadingData && grupos.length === 0 ? (
                                    <tr><td colSpan="7" className="py-10 text-center"><LoadingSpinner /></td></tr>
                                ) : grupos.length > 0 ? (
                                    grupos.map((grupo, index) => (
                                        <tr key={grupo.id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-3 py-3 text-sm font-bold text-gray-700">{grupo.nombre}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600">{grupo.grado?.nombre || "N/A"}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600">{grupo.sede?.nombre || "N/A"}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600 capitalize">{grupo.jornada.toLowerCase()}</td>
                                            <td className="px-3 py-3 text-sm text-gray-600">
                                                {grupo.director ?
                                                    `${grupo.director.nombre} ${grupo.director.apellidos}` :
                                                    <span className="text-gray-400 italic">Sin asignar</span>
                                                }
                                            </td>
                                            <td className="px-3 py-3 text-center text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${grupo.sobrecupoPermitido ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {grupo.cupos}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right space-x-2">
                                                <button
                                                    onClick={() => handleEdit(grupo)}
                                                    className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition"
                                                    title="Editar"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(grupo)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition"
                                                    title="Eliminar"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500 italic">
                                            {activeSearch ? `No se encontraron resultados para "${activeSearch}"` : "No se encontraron grupos con los filtros seleccionados."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* PAGINACIÓN */}
                    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
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

export default Grupos;