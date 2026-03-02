import React, { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faPersonChalkboard,
    faEdit,
    faTrash,
    faSearch,
    faChevronLeft,
    faChevronRight
} from "@fortawesome/free-solid-svg-icons";

import { fetchDocentesData, crearDocente, actualizarDocente, eliminarDocente } from "../../api/docentesService.js";
import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import DocentesForm from "./DocentesForm.jsx";

const Docentes = () => {
    // --- ESTADOS ---
    const initialFormState = {
        id: null,
        documento: "",
        nombre: "",
        apellidos: "",
        fechaNacimiento: "",
        email: "",
        telefono: "",
        direccion: "",
        profesion: "",
        areaEnsenanza: "",

        // Datos Administrativos NUEVOS
        decretoLey: "",
        escalafon: "",
        decretoNombrado: "",
        fechaNombrado: "",
        fechaIngreso: "",
        fechaRetiro: "",

        nivelEducativo: "",
        nivelEnsenanza: "",
        vinculacion: "",
        activo: true
    };

    // Diccionario para traducir los códigos de vinculación
    const TIPO_VINCULACION = {
        "PD": "Propiedad",
        "PP": "Periodo de Prueba",
        "PV": "Provisionalidad",
        "TR": "Temporalidad",
        "OT": "Otro"
    };

    const [formData, setFormData] = useState(initialFormState);
    const [docentes, setDocentes] = useState([]);

    // Paginación y Filtros
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    // Estado para el Debounce (Input local vs Valor real de búsqueda)
    const [searchTerm, setSearchTerm] = useState("");
    const [busqueda, setBusqueda] = useState("");

    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);
    const formRef = useRef(null);

    // --- FUNCIÓN DE CARGA DE DATOS ---
    // Usamos useCallback para que sea estable y no cause loops en useEffect
    const loadData = useCallback(async (page, term) => {
        try {
            setLoading(true);
            const { docentesData } = await fetchDocentesData({
                page: page,
                limit: pagination.limit,
                busqueda: term
            });

            setDocentes(docentesData.items);
            setPagination(prev => ({
                ...prev,
                page: docentesData.page,
                total: docentesData.total
            }));
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    }, [pagination.limit]);

    // --- EFECTOS ---

    // Debounce para el buscador: Espera 500ms antes de actualizar 'busqueda'
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            // Solo si el término cambió realmente actualizamos la búsqueda principal
            if (searchTerm !== busqueda) {
                setBusqueda(searchTerm);
                setPagination(prev => ({ ...prev, page: 1 })); // Reset a pág 1
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, busqueda]);

    // Cargar datos cuando cambia la página o la búsqueda confirmada
    useEffect(() => {
        loadData(pagination.page, busqueda);
    }, [loadData, pagination.page, busqueda]);

    // --- HANDLERS ---

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const requiredFields = ["documento", "nombre", "apellidos", "email", "nivelEducativo", "nivelEnsenanza", "vinculacion"];

        // Validación de campos
        for (const field of requiredFields) {
            if (!formData[field]) return showWarning("Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.");
        }

        try {
            setLoading(true);
            if (mode === "agregar") {
                const { id, ...payload } = formData;
                await crearDocente(payload);

                showSuccess("Docente registrado exitosamente.");

                // Limpiamos búsqueda y recargamos la página 1 para ver el nuevo registro
                setSearchTerm("");
                setBusqueda("");
                loadData(1, "");

            } else {
                await actualizarDocente(formData.id, formData);

                showSuccess("Docente actualizado exitosamente.");
                loadData(pagination.page, busqueda); // Recargamos la página ACTUAL para reflejar cambios sin perder ubicación
            }
            resetForm();
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (docente) => {
        setFormData({
            ...docente,
            // Mapeo seguro para evitar nulls en inputs
            areaEnsenanza: docente.areaEnsenanza || "",
            email: docente.email || "",
            telefono: docente.telefono || "",
            direccion: docente.direccion || "",
            profesion: docente.profesion || "",

            // Mapeo de campos administrativos
            decretoLey: docente.decretoLey || "",
            escalafon: docente.escalafon || "",
            decretoNombrado: docente.decretoNombrado || "",
            fechaNombrado: docente.fechaNombrado || "",
            fechaIngreso: docente.fechaIngreso || "",
            fechaRetiro: docente.fechaRetiro || "",
        });
        setMode("editar");
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        const confirm = await showConfirm("Esta acción eliminará permanentemente al docente y sus datos asociados.", "¿Eliminar docente?");
        if (!confirm) return;

        try {
            setLoading(true);
            await eliminarDocente(id);

            // Recargamos la página actual
            loadData(pagination.page, busqueda);

            showSuccess("Docente eliminado.");
            if (formData.id === id) resetForm();
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

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* HEADER */}
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <FontAwesomeIcon icon={faPersonChalkboard} className="text-2xl text-blue-600 mr-3" />
                    Gestión de Docentes
                </h1>

                {/* Formulario */}
                <div ref={formRef}>
                    <DocentesForm
                        formData={formData}
                        mode={mode}
                        loading={loading}
                        handleChange={handleChange}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                    />
                </div>

                {/* --- TARJETA DE LISTADO (Estilo Matrículas) --- */}
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">

                    {/* HEADER DE LA TABLA: Título Izq | Buscador Der */}
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <h2 className="text-lg font-semibold text-gray-700">
                            Docentes registrados ({pagination.total})
                        </h2>

                        {/* Buscador Debounce */}
                        <div className="relative w-full md:w-72">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-colors text-sm"
                            />
                        </div>
                    </div>

                    {/* TABLA */}
                    {loading && docentes.length === 0 ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Docente</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Área / Profesión</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vinculación</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {docentes.length > 0 ? (
                                        docentes.map((d) => (
                                            <tr key={d.id} className={`hover:bg-blue-50 transition-colors ${!d.activo ? 'bg-gray-50' : ''}`}>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase tracking-wide border
                                                        ${d.activo ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                        {d.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 font-mono">{d.documento}</td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900">{d.apellidos} {d.nombre}</div>
                                                    <div className="text-xs text-gray-500">{d.email}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-800 font-medium">
                                                        {d.areaEnsenanza || "Sin Especificar"}
                                                    </div>
                                                    {d.profesion && (
                                                        <div className="text-xs text-gray-500 italic truncate max-w-[200px]" title={d.profesion}>
                                                            {d.profesion}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-700">
                                                        {/* Traducimos el código, si no existe mostramos el código original */}
                                                        {TIPO_VINCULACION[d.vinculacion] || d.vinculacion}
                                                    </div>

                                                    {/* Si tiene decreto, lo mostramos debajo como una etiqueta pequeña */}
                                                    {d.decretoLey && (
                                                        <div className="mt-1">
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                                                Dec. {d.decretoLey}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                                                    <button onClick={() => handleEdit(d)} className="text-blue-600 hover:text-blue-800 p-1 transition-colors" title="Editar">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:text-red-700 p-1 transition-colors" title="Eliminar">
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                                No se encontraron docentes registrados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* FOOTER: PAGINACIÓN (Estilo Matrículas) */}
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                        <span className="text-sm text-gray-600">
                            Página {pagination.page} de {totalPages || 1}
                        </span>

                        <div className="flex space-x-2">
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} size="sm" />
                            </button>
                            <button
                                disabled={pagination.page >= totalPages}
                                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600"
                            >
                                <FontAwesomeIcon icon={faChevronRight} size="sm" />
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Docentes;