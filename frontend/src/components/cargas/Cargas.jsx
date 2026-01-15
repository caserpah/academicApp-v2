import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faLayerGroup,
    faEdit,
    faTrash,
    faSearch,
    faFilter,
    faEraser,
    faPlus,
    faChevronLeft,
    faChevronRight
} from "@fortawesome/free-solid-svg-icons";

import { fetchCargas, fetchCargasCatalogs, eliminarCarga } from "../../api/cargasService.js";
import { showSuccess, showError, showConfirm } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import CargasForm from "./CargasForm.jsx";

const Cargas = () => {
    // --- ESTADOS ---
    const [cargas, setCargas] = useState([]);

    // Catálogos para los selects de filtro
    const [catalogos, setCatalogos] = useState({ sedes: [], grados: [] });

    // Estado de Paginación
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

    // Estado de Filtros (Lo que el usuario selecciona)
    const [filtros, setFiltros] = useState({
        sedeId: "",
        gradoId: "",
        jornada: "",
        busqueda: "" // El valor confirmado del debounce
    });

    // Estado local del input buscador (para efecto debounce)
    const [searchTerm, setSearchTerm] = useState("");

    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState("lista"); // 'lista' | 'agregar' | 'editar'
    const [selectedCarga, setSelectedCarga] = useState(null);

    // --- CARGA INICIAL DE CATÁLOGOS ---
    useEffect(() => {
        const cargarCatalogos = async () => {
            try {
                const data = await fetchCargasCatalogs();
                setCatalogos({
                    sedes: data.sedes,
                    grados: data.grados
                });
            } catch {
                showError("Error cargando listas de filtros.");
            }
        };
        cargarCatalogos();
    }, []);

    // --- FUNCIÓN DE CARGA DE DATOS ---
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchCargas({
                page: pagination.page,
                limit: pagination.limit,
                ...filtros // Enviamos sedeId, gradoId, jornada, busqueda
            });

            setCargas(data.items);
            setPagination(prev => ({ ...prev, total: data.total }));
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, filtros]);

    // Reaccionar a cambios en filtros o paginación
    useEffect(() => {
        loadData();
    }, [loadData]);

    // --- DEBOUNCE DEL BUSCADOR ---
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== filtros.busqueda) {
                setFiltros(prev => ({ ...prev, busqueda: searchTerm }));
                setPagination(prev => ({ ...prev, page: 1 })); // Reset paginación al buscar
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, filtros.busqueda]);

    // --- HANDLERS ---

    const handleFiltroChange = (e) => {
        const { name, value } = e.target;
        setFiltros(prev => ({
            ...prev,
            [name]: value
        }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset paginación al filtrar
    };

    const limpiarFiltros = () => {
        setFiltros({
            sedeId: "",
            gradoId: "",
            jornada: "",
            busqueda: ""
        });
        setSearchTerm("");
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleDelete = async (id) => {
        const confirm = await showConfirm("¿Eliminar esta carga académica? Esto afectará los horarios.", "Eliminar carga académica");
        if (!confirm) return;

        try {
            setLoading(true);
            await eliminarCarga(id);
            showSuccess("Carga eliminada.");
            loadData();
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    // --- RENDER ---
    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* 1. Título y Botón Agregar */}
                <div className="flex justify-between items-center border-b pb-4">
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faLayerGroup} className="text-2xl text-[#2c3e50] mr-3" />
                        <h1 className="text-2xl font-semibold text-gray-800">Carga Académica</h1>
                    </div>
                    {mode === 'lista' && (
                        <button
                            onClick={() => { setSelectedCarga(null); setMode("agregar"); }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center"
                        >
                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                            Nueva Carga
                        </button>
                    )}
                </div>

                {mode === 'lista' ? (
                    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">

                        {/* 2. HEADER DE LA TARJETA (Título conteo + Buscador) */}
                        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                            <h2 className="text-lg font-semibold text-gray-700">
                                Cargas registradas ({pagination.total})
                            </h2>
                            <div className="relative w-full md:w-72">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <FontAwesomeIcon icon={faSearch} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar docente, asignatura..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-sm"
                                />
                            </div>
                        </div>

                        {/* 3. BARRA DE FILTROS AVANZADA (Estilo Gris) */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">

                                {/* Filtro Sede */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sede</label>
                                    <select
                                        name="sedeId"
                                        value={filtros.sedeId}
                                        onChange={handleFiltroChange}
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todas las Sedes</option>
                                        {catalogos.sedes.map(s => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filtro Grado */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Grado</label>
                                    <select
                                        name="gradoId"
                                        value={filtros.gradoId}
                                        onChange={handleFiltroChange}
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todos los Grados</option>
                                        {catalogos.grados.map(g => (
                                            <option key={g.id} value={g.id}>{g.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Filtro Jornada */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Jornada</label>
                                    <select
                                        name="jornada"
                                        value={filtros.jornada}
                                        onChange={handleFiltroChange}
                                        className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">Todas</option>
                                        <option value="MAÑANA">Mañana</option>
                                        <option value="TARDE">Tarde</option>
                                        <option value="NOCHE">Noche</option>
                                        <option value="COMPLETA">Completa</option>
                                    </select>
                                </div>

                                {/* Botón Limpiar */}
                                <div>
                                    <button
                                        onClick={limpiarFiltros}
                                        className="w-full bg-white border border-gray-300 text-gray-600 py-2 px-4 rounded-md hover:bg-gray-100 transition flex justify-center items-center text-sm font-medium"
                                    >
                                        <FontAwesomeIcon icon={faEraser} className="mr-2" />
                                        Limpiar Filtros
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 4. TABLA DE RESULTADOS */}
                        {loading && cargas.length === 0 ? (
                            <LoadingSpinner />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grupo / Grado</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignatura</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docente Asignado</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede / Jornada</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Horas</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {cargas.length > 0 ? (
                                            cargas.map((c) => (
                                                <tr key={c.id} className="hover:bg-blue-50 transition">

                                                    {/* Grupo y Grado */}
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-bold text-gray-800">{c.grupo?.nombre}</div>
                                                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                            {c.grupo?.grado?.nombre}
                                                        </span>
                                                    </td>

                                                    {/* Asignatura y Código */}
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm font-medium text-gray-900">{c.asignatura?.nombre}</div>
                                                        <div className="text-xs text-gray-400 font-mono">{c.codigo}</div>
                                                    </td>

                                                    {/* Docente */}
                                                    <td className="px-4 py-3">
                                                        <div className="text-sm text-gray-800">
                                                            {c.docente?.apellidos} {c.docente?.nombre}
                                                        </div>
                                                        <div className="text-xs text-gray-500">{c.docente?.documento}</div>
                                                    </td>

                                                    {/* Sede y Jornada */}
                                                    <td className="px-4 py-3">
                                                        <div className="text-xs text-gray-500">{c.sede?.nombre}</div>
                                                        <span className={`text-[10px] font-bold uppercase ${c.grupo?.jornada === 'MAÑANA' ? 'text-orange-500' : 'text-blue-500'
                                                            }`}>
                                                            {c.grupo?.jornada}
                                                        </span>
                                                    </td>

                                                    {/* Horas */}
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-bold text-sm">
                                                            {c.horas}
                                                        </span>
                                                    </td>

                                                    {/* Acciones */}
                                                    <td className="px-4 py-3 text-right space-x-2">
                                                        <button
                                                            onClick={() => { setSelectedCarga(c); setMode("editar"); }}
                                                            className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition"
                                                            title="Editar"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(c.id)}
                                                            className="text-red-500 hover:bg-red-100 p-2 rounded-full transition"
                                                            title="Eliminar"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-10 text-center text-gray-500 italic">
                                                    No se encontraron cargas con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* 5. FOOTER DE PAGINACIÓN */}
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                            <span className="text-sm text-gray-600">
                                Página {pagination.page} de {totalPages || 1}
                            </span>
                            <div className="flex space-x-2">
                                <button
                                    disabled={pagination.page === 1}
                                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} size="sm" />
                                </button>
                                <button
                                    disabled={pagination.page >= totalPages}
                                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                    className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
                                >
                                    <FontAwesomeIcon icon={faChevronRight} size="sm" />
                                </button>
                            </div>
                        </div>

                    </div>
                ) : (
                    // MODO FORMULARIO (Se renderizará cuando creemos el componente)
                    <div>
                        {/* <CargasForm ... /> */}
                        <button onClick={() => setMode("lista")} className="mb-4 text-blue-600 underline">
                            &larr; Volver al listado
                        </button>
                        <p className="bg-white p-10 text-center border rounded">
                            Aquí cargaremos el componente CargasForm.jsx en el siguiente paso.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Cargas;