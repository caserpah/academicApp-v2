import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCalendarAlt,
    faEdit,
    faTrash,
    faSearch,
    faPlus,
    faClock,
} from "@fortawesome/free-solid-svg-icons";

import VentanasForm from "./VentanasForm.jsx";
import { fetchVentanas, fetchVentanasCatalogs, eliminarVentana, crearVentana, actualizarVentana } from "../../api/ventanaCalificacionService.js";
import { showSuccess, showError, showConfirm } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";

const Ventanas = () => {
    const [ventanas, setVentanas] = useState([]);
    const [catalogos, setCatalogos] = useState({ vigencias: [] });
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
    const [filtros, setFiltros] = useState({ vigenciaId: "", busqueda: "" });
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState("lista"); // 'lista' | 'agregar' | 'editar'
    const [selectedVentana, setSelectedVentana] = useState(null);

    // Cargar catálogos (Vigencias)
    useEffect(() => {
        const cargarCats = async () => {
            try {
                const data = await fetchVentanasCatalogs();
                setCatalogos({ vigencias: data.vigencias });
            } catch {
                showError("Error cargando filtros de vigencia.");
            }
        };
        cargarCats();
    }, []);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchVentanas({
                page: pagination.page,
                limit: pagination.limit,
                ...filtros
            });
            setVentanas(data.items);
            setPagination(prev => ({ ...prev, total: data.total }));
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, filtros]);

    useEffect(() => { loadData(); }, [loadData]);

    // Debounce buscador
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== filtros.busqueda) {
                setFiltros(prev => ({ ...prev, busqueda: searchTerm }));
                setPagination(prev => ({ ...prev, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, filtros.busqueda]);

    const handleFiltroChange = (e) => {
        const { name, value } = e.target;
        setFiltros(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleDelete = async (id) => {
        const confirm = await showConfirm("¿Eliminar esta ventana de calificaciones? Los docentes no podrán subir notas para este periodo.", "Eliminar Ventana");
        if (!confirm) return;
        try {
            setLoading(true);
            await eliminarVentana(id);
            showSuccess("Ventana de calificaciones eliminada.");
            loadData();
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Lógica para determinar el estado visual basado en fechas
    const getStatusBadge = (inicio, fin, habilitada) => {
        if (!habilitada) return <span className="px-2 py-1 rounded-full bg-gray-200 text-gray-600 text-xs font-bold">DESHABILITADA</span>;

        const hoy = new Date().toISOString().split('T')[0];
        if (hoy < inicio) return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase">Programada</span>;
        if (hoy > fin) return <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase">Cerrada</span>;
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase animate-pulse">Abierta</span>;
    };

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center border-b pb-4">
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-2xl text-[#2c3e50] mr-3" />
                        <h1 className="text-2xl font-semibold text-gray-800">Ventanas de Calificaciones</h1>
                    </div>
                    <button
                        onClick={() => { setSelectedVentana(null); setMode("agregar"); }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition flex items-center shadow-sm text-sm font-medium"
                    >
                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                        Nueva Ventana
                    </button>
                </div>

                {/* Tabla y Filtros */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full md:w-auto">
                            <select name="vigenciaId" value={filtros.vigenciaId} onChange={handleFiltroChange} className="border border-gray-300 rounded-lg p-2 text-sm bg-white">
                                <option value="">Año Lectivo (Todos)</option>
                                {catalogos.vigencias.map(v => <option key={v.id} value={v.id}>{v.anio}</option>)}
                            </select>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                                    <FontAwesomeIcon icon={faSearch} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Buscar descripción..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-indigo-100 text-sm"
                                />
                            </div>
                        </div>
                        <h2 className="text-sm font-medium text-gray-500">Total: {pagination.total} registros</h2>
                    </div>

                    {loading && ventanas.length === 0 ? <LoadingSpinner /> : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Periodo</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fechas (Inicio - Fin)</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Año</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {ventanas.map((v) => (
                                        <tr key={v.id} className="hover:bg-indigo-50/50 transition">
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-indigo-900">Periodo {v.periodo}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faClock} className="text-gray-400 text-xs" />
                                                    {v.fechaInicio} <span className="text-gray-300">|</span> {v.fechaFin}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{v.vigencia?.anio}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-center">
                                                {getStatusBadge(v.fechaInicio, v.fechaFin, v.habilitada)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                <button onClick={() => { setSelectedVentana(v); setMode("editar"); }} className="text-indigo-600 hover:bg-indigo-100 p-2 rounded-full transition"><FontAwesomeIcon icon={faEdit} /></button>
                                                <button onClick={() => handleDelete(v.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-full transition"><FontAwesomeIcon icon={faTrash} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Modal Formulario */}
                {(mode === 'agregar' || mode === 'editar') && (
                    <VentanasForm
                        selectedVentana={selectedVentana}
                        onSuccess={() => { showSuccess("Datos guardados exitosamente."); setMode("lista"); loadData(); }}
                        onCancel={() => setMode("lista")}
                        crearAPI={crearVentana}
                        actualizarAPI={actualizarVentana}
                    />
                )}
            </div>
        </div>
    );
};

export default Ventanas;