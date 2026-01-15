import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faEdit, faTrash, faScaleBalanced, faToggleOn, faToggleOff,
    faSearch, faChevronLeft, faChevronRight, faSpinner, faEraser
} from "@fortawesome/free-solid-svg-icons";

import {
    fetchCatalogs,
    fetchJuiciosPaginated,
    crearJuicio,
    actualizarJuicio,
    eliminarJuicio,
} from "../../api/juiciosService.js";

import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import JuiciosForm from "./JuiciosForm.jsx";

const Juicios = () => {
    // --- ESTADOS ---
    const initialFormState = {
        id: null, texto: '', periodo: '', activo: true,
        gradoId: '', dimensionId: '', desempenoId: '', asignaturaId: '', vigenciaId: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [juicios, setJuicios] = useState([]);
    const [vigencia, setVigencia] = useState(null);

    // Catálogos
    const [asignaturas, setAsignaturas] = useState([]);
    const [grados, setGrados] = useState([]);
    const [dimensiones, setDimensiones] = useState([]);
    const [desempenos, setDesempenos] = useState([]);
    const [rangos, setRangos] = useState([]);

    // Filtros Estructurados
    const [filters, setFilters] = useState({
        gradoId: '',
        asignaturaId: '',
        dimensionId: ''
    });

    // Búsqueda y Paginación
    const [searchTerm, setSearchTerm] = useState("");      // Lo que escribe el usuario
    const [activeSearch, setActiveSearch] = useState("");  // Lo que se envía al backend (con delay)

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });

    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const formContainerRef = useRef(null);

    // --- CARGA INICIAL ---
    useEffect(() => {
        const loadCatalogs = async () => {
            try {
                setLoading(true);
                const data = await fetchCatalogs();
                setVigencia(data.vigencia);
                setAsignaturas(data.asignaturas);
                setGrados(data.grados);
                setDimensiones(data.dimensiones);
                setDesempenos(data.desempenos);
                setRangos(data.rangos);

                if (data.vigencia?.id) {
                    setFormData(prev => ({ ...prev, vigenciaId: data.vigencia.id }));
                }
            } catch (err) {
                console.error(err);
                showError("Error cargando catálogos iniciales.");
            } finally {
                setLoading(false);
            }
        };
        loadCatalogs();
    }, []);

    // --- EFECTO DEBOUCE (BÚSQUEDA EN TIEMPO REAL) ---
    useEffect(() => {
        // Configuramos un temporizador para no llamar a la API en cada tecla
        const delayDebounceFn = setTimeout(() => {
            setActiveSearch(searchTerm); // Actualiza la búsqueda activa
            setPagination(prev => ({ ...prev, page: 1 })); // Resetea a página 1
        }, 500); // Espera 500ms después de dejar de escribir

        return () => clearTimeout(delayDebounceFn); // Limpia el timer si el usuario sigue escribiendo
    }, [searchTerm]);

    // --- CARGA DE DATOS ---
    const loadJuicios = useCallback(async () => {
        if (!vigencia?.id) return;

        try {
            setLoadingData(true);
            const params = {
                vigenciaId: vigencia.id,
                page: pagination.page,
                limit: pagination.limit,
                search: activeSearch,
                ...filters // Esparcimos gradoId, asignaturaId, dimensionId
            };

            const response = await fetchJuiciosPaginated(params);

            setJuicios(response.items || []);
            setPagination(prev => ({
                ...prev,
                total: response.pagination?.total || 0,
                totalPages: response.pagination?.totalPages || 1
            }));

        } catch (err) {
            console.error(err);
            showError("Error obteniendo el listado de juicios.");
        } finally {
            setLoadingData(false);
        }
    }, [vigencia, pagination.page, pagination.limit, activeSearch, filters]);

    // Recargar cuando cambie la página, vigencia o la búsqueda activa (activeSearch)
    useEffect(() => {
        loadJuicios();
    }, [loadJuicios]);

    // --- HANDLERS FILTROS ---
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, page: 1 })); // Resetear página al filtrar
    };

    const clearFilters = () => {
        setFilters({ gradoId: '', asignaturaId: '', dimensionId: '' });
        setSearchTerm("");
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    // --- HANDLERS FORMULARIO ---
    const handleSearchInput = (e) => {
        setSearchTerm(e.target.value);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const requiredFields = ['texto', 'periodo', 'gradoId', 'dimensionId', 'desempenoId', 'asignaturaId', 'vigenciaId'];
        for (const field of requiredFields) {
            if (!formData[field]) return showWarning("Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.");
        }

        try {
            setLoading(true);
            const dataToSubmit = { ...formData };
            Object.keys(dataToSubmit).forEach(k => {
                if (typeof dataToSubmit[k] === 'string' && dataToSubmit[k].trim() === '') dataToSubmit[k] = null;
            });

            if (mode === "agregar") {
                const { id, ...dataToCreate } = dataToSubmit;
                await crearJuicio(dataToCreate);
                showSuccess(`Juicio creado exitosamente.`);
            } else {
                const { id, ...dataToUpdate } = dataToSubmit;
                await actualizarJuicio(id, dataToUpdate);
                showSuccess(`Juicio actualizado exitosamente.`);
            }
            loadJuicios();
            resetForm();
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (juicio) => {
        setFormData({
            id: juicio.id,
            texto: juicio.texto,
            gradoId: juicio.grado?.id || juicio.gradoId,
            periodo: typeof juicio.periodo === 'object' ? (juicio.periodo.orden || juicio.periodo.id) : juicio.periodo,
            dimensionId: juicio.dimension?.id || juicio.dimensionId,
            desempenoId: juicio.desempeno?.id || juicio.desempenoId,
            asignaturaId: juicio.asignatura?.id || juicio.asignaturaId,
            vigenciaId: juicio.vigenciaId,
            activo: juicio.activo
        });
        setMode("editar");
        formContainerRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleDelete = async (juicio) => {
        if (await showConfirm("Esta acción eliminará permanentemente al juicio académico y sus datos asociados.", "¿Eliminar juicio?")) {
            try {
                setLoading(true);
                await eliminarJuicio(juicio.id);
                loadJuicios();
                showSuccess("Juicio eliminado exitosamente.");
                if (formData.id === juicio.id) resetForm();
            } catch (err) {
                showError(err.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleToggleActivo = async (juicio) => {
        try {
            const nuevoEstado = !juicio.activo;
            setJuicios(prev => prev.map(j => j.id === juicio.id ? { ...j, activo: nuevoEstado } : j));
            await actualizarJuicio(juicio.id, { activo: nuevoEstado });
            showSuccess(`Juicio ${nuevoEstado ? 'activado' : 'desactivado'}.`);
        } catch (err) {
            loadJuicios();
            showError(err.message);
        }
    };

    const resetForm = () => {
        setFormData({ ...initialFormState, vigenciaId: vigencia ? vigencia.id : '' });
        setMode("agregar");
    };

    // --- RENDERIZADO ---
    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Principal */}
                <h1 className="text-2xl font-semibold text-gray-800 mb-6 border-b pb-2">
                    <FontAwesomeIcon icon={faScaleBalanced} className="w-6 h-6 mr-3 text-[#2c3e50]" />
                    Gestión de Juicios
                </h1>

                {/* Formulario */}
                <div ref={formContainerRef}>
                    <JuiciosForm
                        formData={formData}
                        mode={mode}
                        loading={loading}
                        handleChange={(e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                        asignaturas={asignaturas}
                        vigencia={vigencia}
                        grados={grados}
                        dimensiones={dimensiones}
                        desempenos={desempenos}
                        rangos={rangos}
                    />
                </div>

                {/* --- SECCIÓN DE FILTROS Y TABLA --- */}
                <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-6">

                    {/* Header: Título y Buscador Global */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-xl font-semibold text-gray-700">
                            Juicios registrados ({pagination.total})
                        </h2>

                        {/* Buscador de Texto */}
                        <div className="relative w-full md:w-72">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={handleSearchInput}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                            />
                            <FontAwesomeIcon
                                icon={faSearch}
                                className="absolute left-3 top-2.5 text-gray-400 text-sm"
                            />
                            {/* Icono de carga si el usuario está escribiendo o la data cargando */}
                            {loadingData && (
                                <div className="absolute right-3 top-2.5">
                                    <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- BARRA DE FILTROS DESPLEGABLES --- */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
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
                                {grados.map(g => <option key={g.id} value={g.id}>{g.nombre.replace(/_/g, " ")}</option>)}
                            </select>
                        </div>

                        {/* Filtro Asignatura */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-500 mb-1 ml-1">Asignatura</label>
                            <select
                                name="asignaturaId"
                                value={filters.asignaturaId}
                                onChange={handleFilterChange}
                                className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                            >
                                <option value="">Todas las Asignaturas</option>
                                {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                        </div>

                        {/* Filtro Dimensión */}
                        <div className="flex flex-col">
                            <label className="text-xs font-bold text-gray-500 mb-1 ml-1">Dimensión</label>
                            <select
                                name="dimensionId"
                                value={filters.dimensionId}
                                onChange={handleFilterChange}
                                className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                            >
                                <option value="">Todas las Dimensiones</option>
                                {dimensiones.map(d => <option key={d.id} value={d.id}>{d.nombre.replace(/_/g, " ")}</option>)}
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
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Período</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grado</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignatura</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensión</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Desempeño</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rangos Nota</th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {loadingData && juicios.length === 0 ? (
                                    <tr><td colSpan="8" className="py-10 text-center"><LoadingSpinner /></td></tr>
                                ) : juicios.length > 0 ? (
                                    juicios.map((juicio, index) => {
                                        const valPeriodo = typeof juicio.periodo === 'object' ? (juicio.periodo.orden || juicio.periodo.id) : juicio.periodo;

                                        const gradoNombre = juicio.grado?.nombre || 'N/A';
                                        const dimNombre = juicio.dimension?.nombre || 'N/A';
                                        const asigNombre = juicio.asignatura?.nombre || 'N/A';

                                        const despObj = juicio.desempeno || {};
                                        const codDesp = despObj.codigo || '';
                                        const nomDesp = despObj.nombre || 'N/A';

                                        const rangoInfo = rangos.find(r => Number(r.desempenoId) === Number(despObj.id || juicio.desempenoId) && Number(r.vigenciaId) === Number(juicio.vigenciaId));
                                        const textoRango = codDesp === 'UN' ? '-' : (rangoInfo ? `${rangoInfo.minNota} - ${rangoInfo.maxNota}` : 'S/D');

                                        let badgeColor = 'bg-gray-100 text-gray-800';
                                        if (codDesp === 'BA') badgeColor = 'bg-red-100 text-red-800';
                                        else if (codDesp === 'BS') badgeColor = 'bg-orange-100 text-orange-800';
                                        else if (codDesp === 'AL') badgeColor = 'bg-blue-100 text-blue-800';
                                        else if (codDesp === 'SU') badgeColor = 'bg-green-100 text-green-800';
                                        else if (codDesp === 'UN') badgeColor = 'bg-purple-100 text-purple-800';

                                        return (
                                            <tr key={juicio.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                <td className="px-3 py-3 text-sm font-bold text-center text-gray-700">{valPeriodo}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">{gradoNombre}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">{asigNombre}</td>
                                                <td className="px-3 py-3 text-sm text-gray-700">{dimNombre}</td>
                                                <td className="px-3 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                                                        {nomDesp}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-600 font-mono text-center">{textoRango}</td>
                                                <td className="px-3 py-3">
                                                    <button onClick={() => handleToggleActivo(juicio)} className="focus:outline-none">
                                                        {juicio.activo ?
                                                            <FontAwesomeIcon icon={faToggleOn} className="text-green-500 text-lg hover:text-green-600" title="Activo" /> :
                                                            <FontAwesomeIcon icon={faToggleOff} className="text-red-400 text-lg hover:text-red-500" title="Inactivo" />
                                                        }
                                                    </button>
                                                </td>
                                                <td className="px-3 py-3 text-right space-x-2">
                                                    <button onClick={() => handleEdit(juicio)} className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition" title="Editar">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button onClick={() => handleDelete(juicio)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition" title="Eliminar">
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="px-6 py-12 text-center text-gray-500 italic">
                                            {activeSearch ? `No se encontraron resultados para "${activeSearch}"` : "No se encontraron juicios registrados."}
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
                                    Página <span className="font-medium">{pagination.page}</span> de <span className="font-medium">{pagination.totalPages}</span>
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
                                        disabled={pagination.page === pagination.totalPages}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${pagination.page === pagination.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
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

export default Juicios;