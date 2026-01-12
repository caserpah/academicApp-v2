import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faPlus,
    faEdit,
    faTrash,
    faSpinner,
    faTimes,
    faChevronLeft,
    faChevronRight,
    faUsers
} from "@fortawesome/free-solid-svg-icons";

import { listarEstudiantes, eliminarEstudiante } from "../../api/estudiantesService.js";
import EstudiantesForm from "../estudiantes/EstudiantesForm.jsx";
import { showConfirm, showError, showSuccess } from "../../utils/notifications.js";

const Estudiantes = () => {
    // --- ESTADOS ---
    const [estudiantes, setEstudiantes] = useState([]);
    const [loading, setLoading] = useState(false);

    // Paginación y Filtros
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [busqueda, setBusqueda] = useState("");

    // Estado para el Modal
    const [mostrarModal, setMostrarModal] = useState(false);
    const [estudianteEditar, setEstudianteEditar] = useState(null);

    // --- EFECTOS ---

    // Cargar estudiantes cuando cambia la página
    useEffect(() => {
        fetchEstudiantes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // Buscador con debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1); // Reset a página 1 al buscar
            fetchEstudiantes();
        }, 500);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busqueda]);

    // --- FUNCIONES ---

    const fetchEstudiantes = async () => {
        setLoading(true);
        try {
            const data = await listarEstudiantes({
                page,
                limit: 10,
                busqueda: busqueda
            });

            setEstudiantes(data.items);

            const calculatedPages = data.pagination?.totalPages || Math.ceil(data.pagination?.total / 10) || 1;
            setTotalPages(calculatedPages);

        } catch (error) {
            console.error(error);
            showError("No se pudo cargar el listado de estudiantes.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmado = await showConfirm("Esta acción eliminará permanentemente al estudiante y sus datos asociados.", "¿Eliminar estudiante?");
        if (!confirmado) return;

        try {
            await eliminarEstudiante(id);
            showSuccess("El estudiante ha sido eliminado correctamente.");
            fetchEstudiantes();
        } catch (error) {
            showError(error.message || "Ocurrió un error al intentar eliminar.");
        }
    };

    const handleAbrirModal = (estudiante = null) => {
        setEstudianteEditar(estudiante);
        setMostrarModal(true);
    };

    const handleCerrarModal = () => {
        setMostrarModal(false);
        setEstudianteEditar(null);
    };

    const handleSuccessForm = () => {
        fetchEstudiantes();
    };

    // --- RENDERIZADO ---

    return (
        <div className="p-6 bg-gray-50 min-h-screen">

            {/* ENCABEZADO */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center mb-4 md:mb-0">
                        <FontAwesomeIcon icon={faUsers} className="w-6 h-6 mr-3 text-[#2c3e50]" />
                        Gestión de Estudiantes
                    </h1>
                    <p className="text-gray-500 text-sm">Gestión de información personal y académica</p>
                </div>
                <button
                    onClick={() => handleAbrirModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg shadow flex items-center text-sm font-medium gap-2 transition-colors"
                >
                    <FontAwesomeIcon icon={faPlus} />
                    <span>Registrar Nuevo Estudiante</span>
                </button>
            </div>

            {/* FILTROS Y BÚSQUEDA */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <FontAwesomeIcon icon={faSearch} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, documento o código..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estudiante</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Identificación</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ubicación</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <FontAwesomeIcon icon={faSpinner} spin className="text-blue-600" />
                                            <span>Cargando estudiantes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : estudiantes.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        No se encontraron registros que coincidan con tu búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                estudiantes.map((est) => (
                                    <tr key={est.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm select-none">
                                                    {est.primerNombre?.charAt(0)}{est.primerApellido?.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 uppercase">
                                                        {est.primerApellido} {est.segundoApellido} {est.primerNombre} {est.segundoNombre}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {est.sexo === 'M' ? 'Masculino' : est.sexo === 'F' ? 'Femenino' : 'Intersexual'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 font-medium">{est.documento}</div>
                                            <div className="text-xs text-gray-500">{est.tipoDocumento}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{est.contacto || "Sin teléfono"}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{est.barrio || "No registrado"}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[150px]" title={est.direccion}>{est.direccion}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleAbrirModal(est)}
                                                className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition"
                                                title="Editar"
                                            >
                                                <FontAwesomeIcon icon={faEdit} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(est.id)}
                                                className="text-red-600 hover:text-red-800 p-1 rounded-full transition duration-150"
                                                title="Eliminar"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINACIÓN */}
                <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Página <span className="font-medium">{page}</span> de <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border hover:text-blue-600 border-gray-300 bg-white text-sm font-medium ${page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <span className="sr-only">Anterior</span>
                                    <FontAwesomeIcon icon={faChevronLeft} className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${page === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <span className="sr-only">Siguiente</span>
                                    <FontAwesomeIcon icon={faChevronRight} className="h-4 w-4" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL INTEGRADO */}
            {mostrarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
                        {/* Cabecera del Modal */}
                        <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-lg">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <FontAwesomeIcon icon={faUsers} className="text-gray-800" />
                                {estudianteEditar ? "Editar Estudiante" : "Registrar Nuevo Estudiante"}
                            </h2>
                            <button
                                onClick={handleCerrarModal}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} size="lg" />
                            </button>
                        </div>

                        {/* Cuerpo del Modal (Formulario) */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <EstudiantesForm
                                estudianteEditar={estudianteEditar}
                                onClose={handleCerrarModal}
                                onSuccess={handleSuccessForm}
                            />
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Estudiantes;