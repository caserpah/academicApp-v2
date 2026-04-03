import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faPlus,
    faEdit,
    faTrash,
    faHandsHoldingChild,
    faChevronLeft,
    faChevronRight,
    faSpinner,
    faKey,
} from "@fortawesome/free-solid-svg-icons";

import { listarAcudientes, eliminarAcudiente, habilitarAccesoWeb } from '../../api/acudientesService.js';
import { showSuccess, showError, showConfirm } from "../../utils/notifications.js";
import AcudientesForm from '../acudientes/AcudientesForm.jsx';

const Acudientes = () => {
    // --- ESTADOS ---
    const [acudientes, setAcudientes] = useState([]);
    // Estado inicial de paginación
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });
    const [loading, setLoading] = useState(false);
    const [busqueda, setBusqueda] = useState("");

    // Estado del Modal
    const [showModal, setShowModal] = useState(false);
    const [registroEditar, setRegistroEditar] = useState(null);

    // --- CARGA DE DATOS ---
    const fetchAcudientes = async (page = 1) => {
        setLoading(true);
        try {
            const data = await listarAcudientes({ page, limit: 10, busqueda });

            setAcudientes(data.items || []);
            // Actualizamos toda la info de paginación que viene del backend
            setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });

        } catch (error) {
            console.error(error);
            showError("Error cargando la lista de acudientes.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAcudientes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- MANEJADORES ---
    const handleBuscar = (e) => {
        setBusqueda(e.target.value);
    };

    // Efecto para buscar automáticamente cuando el usuario escribe (opcional, estilo Estudiantes)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAcudientes(1);
        }, 500); // Debounce de 500ms
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busqueda]);

    const handleEliminar = async (id) => {
        const confirmado = await showConfirm("Esta acción eliminará permanentemente al acudiente y sus datos asociados.", "¿Eliminar acudiente?");
        if (!confirmado) return;

        try {
            await eliminarAcudiente(id);
            showSuccess("Acudiente eliminado correctamente");
            fetchAcudientes(pagination.page);
        } catch (error) {
            console.error(error);
            showError("No se pudo eliminar. Verifique si el acudiente tiene estudiantes asociados.");
        }
    };

    // Habilitar acceso web a un acudiente
    const handleHabilitarAcceso = async (id) => {
        const confirmado = await showConfirm(
            "Se creará una cuenta de usuario usando el número de documento como contraseña inicial.",
            "¿Habilitar acceso web?"
        );
        if (!confirmado) return;

        try {
            await habilitarAccesoWeb(id);
            showSuccess("Acceso web habilitado exitosamente.");
            fetchAcudientes(pagination.page); // Recargar la tabla
        } catch (error) {
            showError(error.message || "No se pudo habilitar el acceso.");
        }
    };

    const openModal = (registro = null) => {
        setRegistroEditar(registro);
        setShowModal(true);
    };

    const handleSuccess = () => {
        setShowModal(false);
        fetchAcudientes(pagination.page);
    };

    // --- CAMBIO DE PÁGINA ---
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            fetchAcudientes(newPage);
        }
    };

    // --- UTILIDADES VISUALES (Helpers) ---
    const getInitials = (nombre, apellido) => {
        return `${nombre?.charAt(0) || ''}${apellido?.charAt(0) || ''}`.toUpperCase();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">

            {/* --- HEADER --- */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faHandsHoldingChild} className="w-6 h-6 mr-3 text-blue-600" />
                        Gestión de Acudientes
                    </h1>
                    <p className="text-gray-500 text-sm">Gestión de información de padres y tutores</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center shadow-sm text-sm font-medium"
                >
                    <FontAwesomeIcon icon={faPlus} /> Registrar Nuevo Acudiente
                </button>
            </div>

            {/* --- BARRA DE BÚSQUEDA --- */}
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
                        onChange={handleBuscar}
                    />
                </div>
            </div>

            {/* --- TABLA --- */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acudiente</th>
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
                                            <span>Cargando acudientes...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : acudientes.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                        No se encontraron registros que coincidan con tu búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                acudientes.map((item) => {
                                    const iniciales = getInitials(item.nombres, item.apellidos);

                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors group">

                                            {/* COLUMNA 1: AVATAR UNIFORME + NOMBRE */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold bg-blue-100 text-blue-600">
                                                        {iniciales}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900 uppercase">
                                                            {item.apellidos} {item.nombres}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            Acudiente / Tutor
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 font-medium">{item.documento}</div>
                                                <div className="text-xs text-gray-500">{item.tipoDocumento}</div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{item.telefono || 'Sin teléfono'}</div>
                                                <div className="text-xs text-blue-500 lowercase truncate max-w-[150px]" title={item.email}>
                                                    {item.email || 'Sin email'}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 truncate max-w-[180px]" title={item.direccion}>
                                                    {item.direccion || 'No registrada'}
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {/* Botones de Editar y Eliminar (que ya tenías) */}
                                                <button
                                                    onClick={() => openModal(item)}
                                                    className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition"
                                                    title="Editar"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button
                                                    onClick={() => handleEliminar(item.id)}
                                                    className="text-red-600 hover:text-red-800 p-1 rounded-full transition duration-150"
                                                    title="Eliminar"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>

                                                {/* Botón de Acceso Web */}
                                                {item.identidad || item.usuarioId ? (
                                                    <span className="text-xs text-green-700 font-bold bg-green-100 px-2 py-1 rounded-full mr-3 border border-green-200" title="Este acudiente ya puede iniciar sesión">
                                                        Con Acceso
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleHabilitarAcceso(item.id)}
                                                        className="text-emerald-600 hover:text-emerald-800 p-1 mr-2 rounded-full hover:bg-emerald-50 transition"
                                                        title="Habilitar Acceso Web"
                                                    >
                                                        <FontAwesomeIcon icon={faKey} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- FOOTER PAGINACIÓN --- */}
                <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Página <span className="font-medium text-gray-700">{pagination.page}</span> de <span className="font-medium text-gray-700">{pagination.totalPages}</span>
                            </p>
                        </div>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${pagination.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
                            </button>
                        </nav>
                    </div>
                    <div className="flex gap-2">

                        <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page === pagination.totalPages}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${pagination.page === pagination.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <AcudientesForm
                    registro={registroEditar}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
};

export default Acudientes;