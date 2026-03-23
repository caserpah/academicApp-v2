import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUsers, faEdit, faTrash, faPlus, faSearch, faChevronRight, faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { showSuccess, showError, showConfirm } from "../../utils/notifications.js";

// Importamos nuestros componentes y servicios
import UsuariosForm from "./UsuariosForm";
import { fetchUsers, crearUsuario, actualizarUsuario, eliminarUsuario } from "../../api/usuariosService.js";
import LoadingSpinner from "../common/LoadingSpinner";

const Usuarios = () => {
    // Estado inicial para el formulario
    const initialState = {
        nombre: "",
        apellidos: "",
        documento: "",
        email: "",
        role: "acudiente",
        password: "",
        telefono: "",
        activo: true
    };

    const [usuarios, setUsuarios] = useState([]);
    const [formData, setFormData] = useState(initialState);
    const [mode, setMode] = useState("lista"); // Modos: 'lista', 'agregar', 'editar'
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState(""); // Para el buscador

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const LIMIT = 10;

    // Cargar usuarios al montar
    useEffect(() => {
        cargarUsuarios();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage]);

    // Búsqueda en el servidor con un pequeño retraso (debounce) para no saturar la API
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (currentPage !== 1) {
                setCurrentPage(1); // Si busca algo, lo devolvemos a la página 1
            } else {
                cargarUsuarios();
            }
        }, 500); // Espera 500ms después de que el usuario deje de escribir

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const cargarUsuarios = async () => {
        setLoading(true);
        try {
            const data = await fetchUsers(currentPage, LIMIT, searchTerm);
            setUsuarios(data.items || []);
            // Calculamos el total de páginas (ej: 41 usuarios / 20 = 3 páginas)
            setTotalPages(Math.ceil((data.total || 0) / LIMIT));
        } catch (error) {
            console.error(error);
            showError("No se pudieron cargar los usuarios.");
        } finally {
            setLoading(false);
        }
    };

    // Manejar envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === "agregar") {
                await crearUsuario(formData);
                showSuccess("Usuario creado exitosamente.");
            } else {
                // Al editar, si el password está vacío, lo quitamos del objeto para no enviarlo
                const dataToUpdate = { ...formData };
                if (!dataToUpdate.password) delete dataToUpdate.password;

                await actualizarUsuario(formData.id, dataToUpdate);
                showSuccess("Usuario actualizado exitosamente.");
            }
            cargarUsuarios();
            setMode("lista");
            setFormData(initialState);
        } catch (error) {
            showError(error.message || "Error al actualizar el usuario.");
        } finally {
            setLoading(false);
        }
    };

    // Preparar edición
    const handleEdit = (user) => {
        setFormData({ ...user, password: "" }); // Limpiamos password por seguridad
        setMode("editar");
    };

    // Eliminar usuario
    const handleDelete = async (id) => {
        if (await showConfirm("Esta acción eliminará permanentemente al usuario y sus datos asociados.", "¿Eliminar usuario?")) {
            try {
                setLoading(true);
                await eliminarUsuario(id);
                showSuccess("Usuario eliminado exitosamente.");
                cargarUsuarios();
            } catch (error) {
                showError(error.message || "Error al eliminar el usuario.");
            } finally {
                setLoading(false);
            }
        }
    };

    // ===============================
    // Renderizado
    // ===============================
    return (
        <div className="p-6 max-w-7xl mx-auto font-inter text-gray-800">

            {/* Cabecera Principal */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <FontAwesomeIcon icon={faUsers} className="mr-3 text-blue-600" />
                    Gestión de Usuarios
                </h1>

                {mode === "lista" && (
                    <div className="flex gap-4 w-full md:w-auto">
                        {/* Buscador */}
                        <div className="relative flex-grow md:flex-grow-0">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                                <FontAwesomeIcon icon={faSearch} />
                            </span>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Botón Agregar */}
                        <button
                            onClick={() => { setFormData(initialState); setMode("agregar"); }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition flex items-center whitespace-nowrap"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-2" /> Nuevo Usuario
                        </button>
                    </div>
                )}
            </div>

            {/* Contenido: Formulario o Tabla */}
            {mode !== "lista" ? (
                <UsuariosForm
                    formData={formData}
                    mode={mode}
                    loading={loading}
                    handleChange={(e) => {
                        // Manejo especial para checkboxes vs inputs normales
                        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                        setFormData({ ...formData, [e.target.name]: value });
                    }}
                    handleSubmit={handleSubmit}
                    resetForm={() => { setMode("lista"); setFormData(initialState); }}
                />
            ) : (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                    {loading && usuarios.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Cargando usuarios...</div>
                    ) : (

                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Documento</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {usuarios.length > 0 ? usuarios.map((user) => (
                                            <tr key={user.id} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{user.apellidos} {user.nombre}</div>
                                                    <div className="text-sm text-gray-500">{user.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{user.documento}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold
                                                        ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                            user.role === 'docente' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {user.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {user.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-3">
                                                    <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-900 transition" title="Editar">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900 transition" title="Eliminar">
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic">
                                                    No se encontraron usuarios.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* CONTROLES DE PAGINACIÓN */}
                            {totalPages > 1 && (
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between sm:px-6">
                                    {/* Botones versión móvil */}
                                    <div className="flex-1 flex justify-between sm:hidden">
                                        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                                            <FontAwesomeIcon icon={faChevronLeft} />
                                        </button>
                                        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">
                                            <FontAwesomeIcon icon={faChevronRight} />
                                        </button>
                                    </div>

                                    {/* Botones versión escritorio */}
                                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm text-gray-700">
                                                Página <span className="font-medium">{currentPage}</span> de <span className="font-medium">{totalPages}</span>
                                            </p>
                                        </div>
                                        <div>
                                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition">
                                                    <FontAwesomeIcon icon={faChevronLeft} />
                                                </button>
                                                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition">
                                                    <FontAwesomeIcon icon={faChevronRight} />
                                                </button>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default Usuarios;