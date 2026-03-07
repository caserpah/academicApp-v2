import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom"; // Importamos Link para la navegación
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFilePen, faEdit, faChevronLeft, faChevronRight, faUsers, faSearch, faLock, faFilter
} from "@fortawesome/free-solid-svg-icons";

// Hooks y Servicios
import { useMatriculas } from "../../hooks/useMatriculas.js";
import { showSuccess, showWarning, showError, showConfirm } from "../../utils/notifications.js";
import { fetchInitialData as fetchSedesData } from "../../api/sedesService.js";
import { fetchGruposPorSede } from "../../api/gruposService.js";
import { listarEstudiantes } from "../../api/estudiantesService.js";
import { eliminarMatricula } from "../../api/matriculasService.js";
import { fetchVigencias } from "../../api/vigenciasService.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import MatriculasForm from "./MatriculasForm.jsx";

const Matriculas = () => {
    // --- ESTADOS ---
    const initialFormState = {
        id: null,
        estudianteId: "",
        sedeId: "",
        grupoId: "",
        metodologia: "TRADICIONAL",
        estado: "PREMATRICULADO",
        observaciones: "",
        folio: "",
        vigenciaId: "",
        bloqueo_notas: false,
        es_nuevo: false,
        es_repitente: false,
        situacion_ano_anterior: "APROBO"
    };

    const [formData, setFormData] = useState(initialFormState);
    const [mode, setMode] = useState("agregar");

    // Estados de filtros y tabla
    const [busqueda, setBusqueda] = useState("");
    const [page, setPage] = useState(1);

    // Estado para filtros avanzados
    const [filtros, setFiltros] = useState({
        sedeId: "",
        estado: "",
        bloqueo_notas: "",
        es_nuevo: "",
        es_repitente: "",
        situacion_ano_anterior: ""
    });

    // Estado de vigencia activa
    const [vigenciaActiva, setVigenciaActiva] = useState(null);

    // Estados de listas auxiliares
    const [listasAuxiliares, setListasAuxiliares] = useState({ sedes: [], grupos: [], vigencias: [] });
    const [loadingGrupos, setLoadingGrupos] = useState(false);
    const [processing, setProcessing] = useState(false);

    const formContainerRef = useRef(null);

    // Hook Principal
    const {
        matriculas,
        paginacion,
        loading: loadingMatriculas,
        cargarMatriculas,
        registrarMatricula,
        editarMatricula
    } = useMatriculas();

    // ----------------------------------------------------------------
    // EFECTO: CARGA DE SEDES Y VIGENCIAS(Solo una vez al montar)
    // ----------------------------------------------------------------
    useEffect(() => {
        const cargarDatosMaestros = async () => {
            try {
                // Ejecutamos ambas peticiones en paralelo
                const [dataSedes, listaVigencias] = await Promise.all([
                    fetchSedesData(),
                    fetchVigencias()
                ]);

                // DETECTAR VIGENCIA ACTIVA (Buscamos la que tiene activa: true)
                const activa = listaVigencias?.find(v => v.activa === true);
                if (activa) {
                    setVigenciaActiva(activa);
                    setFormData(prev => ({ ...prev, vigenciaId: activa.id })); // Preseleccionamos la vigencia activa
                }

                setListasAuxiliares(prev => ({
                    ...prev,
                    sedes: dataSedes?.sedes || [],
                    vigencias: listaVigencias || []
                }));

            } catch (err) {
                console.error("Error cargando datos maestros:", err);
                showWarning("No se pudieron cargar algunas listas desplegables.");
            }
        };
        cargarDatosMaestros();
    }, []);

    // ----------------------------------------------------------------
    // EFECTO: CARGA DE TABLA (Al montar y al cambiar filtros)
    // ----------------------------------------------------------------
    useEffect(() => {
        const timer = setTimeout(() => {
            cargarMatriculas({
                page,
                limit: 20,
                busqueda,
                ...filtros // Esparcimos los filtros avanzados
            });
        }, 500);
        return () => clearTimeout(timer);
    }, [page, busqueda, filtros, cargarMatriculas]); // Agregamos 'filtros' a dependencias

    // ----------------------------------------------------------------
    // EFECTO: CARGA DE GRUPOS (Cascada al cambiar Sede)
    // ----------------------------------------------------------------
    useEffect(() => {
        const cargarGrupos = async () => {
            if (!formData.sedeId) {
                setListasAuxiliares(prev => ({ ...prev, grupos: [] }));
                return;
            }
            setLoadingGrupos(true);
            try {
                const grupos = await fetchGruposPorSede(formData.sedeId);
                setListasAuxiliares(prev => ({ ...prev, grupos: grupos || [] }));
            } catch (error) {
                console.error("Error cargando grupos:", error);
                setListasAuxiliares(prev => ({ ...prev, grupos: [] }));
            } finally {
                setLoadingGrupos(false);
            }
        };
        cargarGrupos();
    }, [formData.sedeId]);

    // ----------------------------------------------------------------
    // MANEJADORES
    // ----------------------------------------------------------------

    const handleFiltroChange = (e) => {
        const { name, value } = e.target;
        setFiltros(prev => ({ ...prev, [name]: value }));
        setPage(1); // Resetear a página 1 al filtrar
    };

    const handleBuscarEstudiante = async (termino) => {
        if (!termino || termino.trim().length < 3) {
            showWarning("Ingrese al menos 3 caracteres.");
            return;
        }
        try {
            const resultado = await listarEstudiantes({ busqueda: termino, limit: 1 });
            if (resultado.items && resultado.items.length > 0) {
                const est = resultado.items[0];
                setFormData(prev => ({
                    ...prev,
                    estudianteId: est.id,
                    estudiante: est
                }));
            } else {
                showWarning("Estudiante no encontrado.");
                setFormData(prev => ({ ...prev, estudianteId: "", estudiante: null }));
            }
        } catch {
            showError("Error al buscar estudiante.");
        }
    };

    // Deseleccionar estudiante
    const handleDeselectStudent = () => {
        setFormData(prev => ({ ...prev, estudianteId: "", estudiante: null }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const valorFinal = type === 'checkbox' ? checked : value; // Para checkboxes, el valor final es el estado checked (true/false)

        if (name === "sedeId") {
            setFormData(prev => ({ ...prev, sedeId: valorFinal, grupoId: "" }));
        } else {
            setFormData(prev => ({ ...prev, [name]: valorFinal }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.vigenciaId || !formData.estudianteId || !formData.sedeId || !formData.grupoId) {
            return showWarning("Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.");
        }

        try {
            if (mode === "agregar") {
                await registrarMatricula(formData);
                showSuccess("Matrícula creada.");
            } else {
                await editarMatricula(formData.id, formData);
                showSuccess("Matrícula actualizada.");
            }
            resetForm();
            cargarMatriculas({ page, limit: 20, busqueda, ...filtros }); // Recargar manteniendo filtros actuales
        } catch (err) {
            showError(err.message || "Error al procesar.");
        }
    };

    const handleEdit = (mat) => {
        setFormData({
            ...mat,
            estudianteId: mat.estudianteId,
            sedeId: mat.sedeId,
            grupoId: mat.grupoId,
            vigenciaId: mat.vigenciaId,
            bloqueo_notas: !!mat.bloqueo_notas,
            es_nuevo: !!mat.es_nuevo,
            es_repitente: !!mat.es_repitente,
            situacion_ano_anterior: mat.situacion_ano_anterior || "APROBO",
            observaciones: mat.observaciones || ""
        });
        setMode("editar");
        if (formContainerRef.current) {
            formContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const handleDelete = async () => {
        const idToDelete = formData.id;
        if (!idToDelete) return;

        if (await showConfirm(
            "Esta acción eliminará permanentemente la matrícula. ¿Desea continuar?",
            "Eliminar matrícula"
        )) {
            try {
                setProcessing(true);
                await eliminarMatricula(idToDelete);

                showSuccess("Matrícula eliminada exitosamente.");
                resetForm();
                cargarMatriculas({ page, limit: 20, busqueda, ...filtros });

            } catch (err) {
                showError(err.message || "No se pudo eliminar la matrícula, porque tiene registros asociados.");
            } finally {
                setProcessing(false);
            }
        }
    };

    const resetForm = () => {
        setFormData({
            ...initialFormState,
            vigenciaId: vigenciaActiva?.id || "" // Reseteamos a vigencia activa si existe
        });
        setMode("agregar");
    };

    const getStatusBadge = (estado) => {
        const styles = {
            ACTIVA: "bg-green-100 text-green-800",
            PREMATRICULADO: "bg-blue-100 text-blue-800",
            RETIRADO: "bg-red-100 text-red-800",
            DESERTADO: "bg-gray-100 text-gray-800",
            PROMOVIDO: "bg-purple-100 text-purple-800"
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[estado] || "bg-gray-100"}`}>
                {estado}
            </span>
        );
    };

    /**
     * FILTRADO DE VIGENCIAS PARA EL SELECT
     * Mostrar solo la Vigencia Activa O las Futuras (Año > AñoActivo)
     */
    const vigenciasFiltradas = listasAuxiliares.vigencias.filter(v => {
        // Si estamos editando y el registro pertenece a un año viejo (ej. 2023),
        // debemos permitir verlo para no romper el select.
        if (mode === 'editar' && formData.vigenciaId === v.id) return true;

        // Mostrar vigencia Activa o Futuras
        if (!vigenciaActiva) return true; // Si no cargó la activa, muestra todo por seguridad
        return v.activa || v.anio > vigenciaActiva.anio;
    });

    // ----------------------------------------------------------------
    // RENDERIZADO
    // ----------------------------------------------------------------
    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center pb-4">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faFilePen} className="w-6 h-6 mr-3 text-blue-600" />
                        Gestión de Matrículas
                    </h1>

                    <div className="flex gap-3">
                        {/* Botón Promoción Masiva */}
                        <Link
                            to="/matriculas/masivo"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center shadow-sm text-sm font-medium"
                        >
                            <FontAwesomeIcon icon={faUsers} className="mr-2" />
                            Promoción Masiva
                        </Link>

                        {mode === "editar" && (
                            <button onClick={resetForm} className="text-sm text-blue-600 underline">
                                Cancelar Edición
                            </button>
                        )}
                    </div>
                </div>

                {/* FORMULARIO */}
                <div ref={formContainerRef}>
                    <MatriculasForm
                        formData={formData}
                        mode={mode}
                        loading={loadingMatriculas || processing}
                        loadingGrupos={loadingGrupos}
                        handleChange={handleChange}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                        onBuscarEstudiante={handleBuscarEstudiante}
                        onDeselectStudent={handleDeselectStudent}
                        onDelete={handleDelete}
                        listas={{
                            ...listasAuxiliares,
                            vigencias: vigenciasFiltradas
                        }}
                    />
                </div>

                {/* TABLA Y FILTROS */}
                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-700 pb-3">
                            Matrículas registradas ({paginacion.total})
                        </h2>

                        {/* Buscador General */}
                        <div className="relative w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <FontAwesomeIcon icon={faSearch} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar estudiante..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                                value={busqueda}
                                onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>

                    {/* --- Barra de Filtros Avanzados --- */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">

                        {/* Filtro Sede */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Sede</label>
                            <select name="sedeId" value={filtros.sedeId} onChange={handleFiltroChange} className="w-full border-gray-300 rounded-md text-sm p-1.5 focus:ring-blue-500 focus:border-blue-500">
                                <option value="">Todas las Sedes</option>
                                {listasAuxiliares.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>

                        {/* Filtro Estado */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                            <select name="estado" value={filtros.estado} onChange={handleFiltroChange} className="w-full border-gray-300 rounded-md text-sm p-1.5">
                                <option value="">Todos</option>
                                <option value="ACTIVA">Activa</option>
                                <option value="PREMATRICULADO">Prematriculado</option>
                                <option value="RETIRADO">Retirado</option>
                                <option value="DESERTADO">Desertado</option>
                            </select>
                        </div>

                        {/* Filtro Bloqueo */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Bloqueo Notas</label>
                            <select name="bloqueo_notas" value={filtros.bloqueo_notas} onChange={handleFiltroChange} className="w-full border-gray-300 rounded-md text-sm p-1.5">
                                <option value="">Todos</option>
                                <option value="true">Sí (Bloqueado)</option>
                                <option value="false">No</option>
                            </select>
                        </div>

                        {/* Filtro Nuevo */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Es Nuevo</label>
                            <select name="es_nuevo" value={filtros.es_nuevo} onChange={handleFiltroChange} className="w-full border-gray-300 rounded-md text-sm p-1.5">
                                <option value="">Todos</option>
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        </div>

                        {/* Filtro Repitente */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Es Repitente</label>
                            <select name="es_repitente" value={filtros.es_repitente} onChange={handleFiltroChange} className="w-full border-gray-300 rounded-md text-sm p-1.5">
                                <option value="">Todos</option>
                                <option value="true">Sí</option>
                                <option value="false">No</option>
                            </select>
                        </div>

                        {/* Botón Limpiar - Ocupa todo el ancho en móvil o automático */}
                        <div className="col-span-1 md:col-span-4 lg:col-span-6 flex justify-end mt-2">
                            <button
                                onClick={() => {
                                    setFiltros({ sedeId: "", estado: "", bloqueo_notas: "", es_nuevo: "", es_repitente: "", situacion_ano_anterior: "" });
                                    setPage(1);
                                }}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center"
                            >
                                <FontAwesomeIcon icon={faFilter} className="mr-1" /> Limpiar Filtros
                            </button>
                        </div>
                    </div>

                    {loadingMatriculas ? (
                        <LoadingSpinner message="Cargando matrículas..." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Folio</th>
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estudiante</th>
                                        {/* Columna Sede / Grupo Combinada */}
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede / Grupo</th>
                                        {/* Columna Bloqueo */}
                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase" title="Bloqueo de Notas">
                                            <FontAwesomeIcon icon={faLock} />
                                        </th>
                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {matriculas.length > 0 ? (
                                        matriculas.map((mat, i) => (
                                            <tr key={mat.id} className={i % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50"}>
                                                <td className="px-3 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">{mat.folio}</td>

                                                <td className="px-3 py-3 text-sm font-medium">
                                                    {mat.estudiante?.primerApellido} {mat.estudiante?.primerNombre}
                                                    <div className="text-xs text-gray-400">{mat.estudiante?.documento}</div>
                                                </td>

                                                {/* Columna Sede y Grupo */}
                                                <td className="px-3 py-3 text-sm text-gray-600">
                                                    <div className="font-bold text-xs text-gray-800">{mat.sede?.nombre}</div>
                                                    {mat.grupo ? (
                                                        <span className="text-xs text-blue-600 block mt-0.5">
                                                            {mat.grupo.grado?.nombre} - {mat.grupo.nombre} <span className="text-gray-400">({mat.grupo.jornada?.substring(0, 1)})</span>
                                                        </span>
                                                    ) : <span className="text-xs text-gray-400 italic">Sin Grupo</span>}
                                                </td>

                                                {/* Columna Bloqueo (Icono) */}
                                                <td className="px-3 py-3 text-center">
                                                    {mat.bloqueo_notas ? (
                                                        <FontAwesomeIcon icon={faLock} className="text-red-500" title="Notas Bloqueadas" />
                                                    ) : (
                                                        <span className="text-gray-300 text-xs">-</span>
                                                    )}
                                                </td>

                                                <td className="px-3 py-3 text-center">{getStatusBadge(mat.estado)}</td>

                                                <td className="px-3 py-3 text-right">
                                                    <button onClick={() => handleEdit(mat)} className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                                No se encontraron matrículas con los filtros actuales.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginación */}
                    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Página <span className="font-medium">{page}</span> de <span className="font-medium">{paginacion.totalPages || 1}</span>
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setPage(p => p + 1)}
                                        disabled={page >= (paginacion.totalPages || 1)}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${page >= (paginacion.totalPages || 1) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
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

export default Matriculas;