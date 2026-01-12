

import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom"; // Importamos Link para la navegación
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFilePen, faEdit, faChevronLeft, faChevronRight, faUsers, faSearch
} from "@fortawesome/free-solid-svg-icons";

// Hooks y Servicios
import { useMatriculas } from "../../hooks/useMatriculas.js";
import { showSuccess, showWarning, showError } from "../../utils/notifications.js";
import { fetchInitialData as fetchSedesData } from "../../api/sedesService.js";
import { fetchGruposPorSede } from "../../api/gruposService.js";
import { listarEstudiantes } from "../../api/estudiantesService.js";

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
        folio: ""
    };

    const [formData, setFormData] = useState(initialFormState);
    const [mode, setMode] = useState("agregar");

    // Estados de filtros y tabla
    const [busqueda, setBusqueda] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Estados de listas auxiliares
    const [listasAuxiliares, setListasAuxiliares] = useState({ sedes: [], grupos: [] });
    const [loadingGrupos, setLoadingGrupos] = useState(false);

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
    // EFECTO: CARGA DE SEDES (Solo una vez al montar)
    // ----------------------------------------------------------------
    useEffect(() => {
        const cargarSedes = async () => {
            try {
                const data = await fetchSedesData();
                if (data && data.sedes) {
                    setListasAuxiliares(prev => ({ ...prev, sedes: data.sedes }));
                }
            } catch (err) {
                console.error("Error cargando sedes:", err);
                showError("No se pudieron cargar las sedes.");
            }
        };
        cargarSedes();
    }, []);

    // ----------------------------------------------------------------
    // EFECTO: CARGA DE TABLA (Al montar y al cambiar filtros)
    // ----------------------------------------------------------------
    useEffect(() => {
        // Configuramos un temporizador para no llamar a la API en cada tecla
        const timer = setTimeout(() => {
            cargarMatriculas({ page, limit: 10, busqueda });
        }, 500);
        return () => clearTimeout(timer);
    }, [page, busqueda, cargarMatriculas]);

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
                //showSuccess(`Seleccionado: ${est.primerNombre} ${est.primerApellido}`);
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
        const { name, value } = e.target;
        if (name === "sedeId") {
            setFormData(prev => ({ ...prev, sedeId: value, grupoId: "" }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.estudianteId || !formData.sedeId || !formData.grupoId) {
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
            cargarMatriculas({ page, limit: 10, busqueda });
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
            observaciones: mat.observaciones || ""
        });
        setMode("editar");
        if (formContainerRef.current) {
            formContainerRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const resetForm = () => {
        setFormData(initialFormState);
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

    // ----------------------------------------------------------------
    // RENDERIZADO
    // ----------------------------------------------------------------
    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-center border-b pb-4">
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center mb-4 md:mb-0">
                        <FontAwesomeIcon icon={faFilePen} className="w-6 h-6 mr-3 text-[#2c3e50]" />
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
                        loading={loadingMatriculas}
                        loadingGrupos={loadingGrupos}
                        handleChange={handleChange}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                        listas={listasAuxiliares}
                        onBuscarEstudiante={handleBuscarEstudiante}
                        onDeselectStudent={handleDeselectStudent}
                    />
                </div>

                {/* TABLA */}
                <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-700 mb-4 pb-3">Matrículas registradas ({paginacion.total})</h2>
                        <div className="relative w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                <FontAwesomeIcon icon={faSearch} />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition"
                                value={busqueda}
                                onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                            />
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
                                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grupo</th>
                                        <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {matriculas.length > 0 ? (
                                        matriculas.map((mat, i) => (
                                            <tr key={mat.id} className={i % 2 === 0 ? "bg-white hover:bg-blue-50" : "bg-gray-50 hover:bg-blue-50"}>
                                                <td className="px-3 py-3 text-gray-500 font-mono text-xs">{mat.folio}</td>
                                                <td className="px-3 py-3 text-sm font-medium">
                                                    {mat.estudiante?.primerApellido} {mat.estudiante?.primerNombre}
                                                    <div className="text-xs text-gray-400">{mat.estudiante?.documento}</div>
                                                </td>
                                                <td className="px-3 py-3 text-sm text-gray-600">
                                                    {mat.grupo ? (
                                                        <>
                                                            <span className="font-semibold text-xs text-blue-600 block">{mat.grupo.grado?.nombre}</span>
                                                            {mat.grupo.nombre} - {mat.grupo.jornada}
                                                        </>
                                                    ) : "Sin Grupo"}
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
                                            <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                                No se encontraron matrículas registradas.
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