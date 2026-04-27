import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSchool, faFilter, faEye, faSpinner, faEraser, faListUl
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext.jsx";

import { fetchListadosCatalogs, generarListadoPdf } from "../../api/listadosService.js";
import { showError } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import Swal from "sweetalert2";

const TIPOS_LISTADO = [
    { id: 'estudiantes', label: 'Estudiantes' },
    { id: 'docentes', label: 'Planta Docente' },
    { id: 'directores', label: 'Directores de Grupo' },
    { id: 'areas', label: 'Áreas y Asignaturas' }
];

// Función para mostrar bonito en la UI sin guiones bajos
const formatearTextoVisual = (texto) => {
    if (!texto) return '';
    return texto
        .replace(/_/g, ' ')
        .replace(/MANANA/g, 'MAÑANA');
};

const ListadosPage = () => {
    const { user } = useAuth();

    const [sedes, setSedes] = useState([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Estado principal del formulario
    const [tipoListado, setTipoListado] = useState('');
    const [filters, setFilters] = useState({
        sedeId: '',
        incluirAsignaturas: false,
        rangoInicial: { gradoId: '', grupoId: '' },
        rangoFinal: { gradoId: '', grupoId: '' }
    });

    // Carga de catálogo (Sedes, Grados, Grupos agrupados)
    useEffect(() => {
        const loadInit = async () => {
            try {
                setLoadingCatalogs(true);
                const sedesData = await fetchListadosCatalogs();
                setSedes(sedesData);
                // Si solo hay una sede, la autoseleccionamos
                if (sedesData.length === 1) {
                    setFilters(prev => ({ ...prev, sedeId: sedesData[0].id }));
                }
            } catch (err) {
                showError(err.message);
            } finally {
                setLoadingCatalogs(false);
            }
        };
        if (user) loadInit();
    }, [user]);

    // ==========================================
    // LÓGICA DE EXTRACCIÓN Y FILTRADO EN CASCADA
    // ==========================================

    const gruposSede = useMemo(() => {
        if (!filters.sedeId || filters.sedeId === 'TODAS') return [];
        return sedes.find(s => String(s.id) === String(filters.sedeId))?.grupos || [];
    }, [filters.sedeId, sedes]);

    const gradosSede = useMemo(() => {
        const map = new Map();
        gruposSede.forEach(g => {
            if (!map.has(g.grado.id)) map.set(g.grado.id, g.grado);
        });
        return Array.from(map.values()).sort((a, b) => a.orden - b.orden);
    }, [gruposSede]);

    const gruposIniciales = useMemo(() => {
        return gruposSede.filter(g => String(g.grado.id) === String(filters.rangoInicial.gradoId));
    }, [gruposSede, filters.rangoInicial.gradoId]);

    const gradosFinalesDisponibles = useMemo(() => {
        if (!filters.rangoInicial.gradoId) return [];
        const gradoIn = gradosSede.find(g => String(g.id) === String(filters.rangoInicial.gradoId));
        if (!gradoIn) return []; // Protección ante cambios de sede
        return gradosSede.filter(g => g.orden >= gradoIn.orden);
    }, [gradosSede, filters.rangoInicial.gradoId]);

    const gruposFinales = useMemo(() => {
        return gruposSede.filter(g => String(g.grado.id) === String(filters.rangoFinal.gradoId));
    }, [gruposSede, filters.rangoFinal.gradoId]);


    // ==========================================
    // MANEJADORES DE EVENTOS
    // ==========================================
    const handleTipoChange = (e) => {
        setTipoListado(e.target.value);
        setFilters(prev => ({ ...prev, rangoInicial: { gradoId: '', grupoId: '' }, rangoFinal: { gradoId: '', grupoId: '' } }));
    };

    const handleFilterChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFilters(prev => {
            const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };

            // Limpieza agresiva de rangos si cambian de Sede Educativa
            if (name === 'sedeId') {
                updated.rangoInicial = { gradoId: '', grupoId: '' };
                updated.rangoFinal = { gradoId: '', grupoId: '' };
            }
            return updated;
        });
    };

    const handleRangoInicialChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newInicial = { ...prev.rangoInicial, [name]: value };
            const newFinal = { ...prev.rangoFinal };

            if (name === 'gradoId') {
                newInicial.grupoId = '';
                newFinal.gradoId = value; // Fuerza al final a igualar al inicial
                newFinal.grupoId = '';
            }

            if (name === 'grupoId') {
                newFinal.grupoId = value; // Fuerza al final a igualar al inicial
            }

            return { ...prev, rangoInicial: newInicial, rangoFinal: newFinal };
        });
    };

    const handleRangoFinalChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            rangoFinal: {
                ...prev.rangoFinal,
                [name]: value,
                ...(name === 'gradoId' && { grupoId: '' })
            }
        }));
    };

    const clearFilters = () => {
        setFilters({
            sedeId: sedes.length === 1 ? sedes[0].id : '',
            incluirAsignaturas: false,
            rangoInicial: { gradoId: '', grupoId: '' },
            rangoFinal: { gradoId: '', grupoId: '' }
        });
    };

    const handleGenerarPdf = async () => {
        try {
            setIsGenerating(true);
            let payloadToApi = {};

            if (tipoListado === 'areas') {
                payloadToApi.incluirAsignaturas = filters.incluirAsignaturas;
            }
            else if (tipoListado === 'docentes' || tipoListado === 'directores') {
                payloadToApi.sedeId = filters.sedeId;
            }
            else if (tipoListado === 'estudiantes') {
                const grIn = gradosSede.find(g => String(g.id) === String(filters.rangoInicial.gradoId));
                const gpIn = gruposSede.find(g => String(g.id) === String(filters.rangoInicial.grupoId));
                const grFn = gradosSede.find(g => String(g.id) === String(filters.rangoFinal.gradoId));
                const gpFn = gruposSede.find(g => String(g.id) === String(filters.rangoFinal.grupoId));

                payloadToApi.rangoInicial = { sedeId: filters.sedeId, gradoOrden: grIn.orden, grupoNombre: gpIn.nombre };
                payloadToApi.rangoFinal = { sedeId: filters.sedeId, gradoOrden: grFn.orden, grupoNombre: gpFn.nombre };
            }

            await generarListadoPdf(tipoListado, payloadToApi);

            Swal.fire({
                icon: 'success',
                title: 'Generado',
                text: 'El documento se abrió en una nueva pestaña.',
                timer: 2500,
                showConfirmButton: false
            });
        } catch (error) {
            showError(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const isFormComplete = useMemo(() => {
        if (!tipoListado) return false;
        if (tipoListado === 'areas') return true;
        if ((tipoListado === 'docentes' || tipoListado === 'directores') && filters.sedeId) return true;
        if (tipoListado === 'estudiantes') {
            return filters.sedeId && filters.rangoInicial.grupoId && filters.rangoFinal.grupoId;
        }
        return false;
    }, [tipoListado, filters]);

    if (loadingCatalogs) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faListUl} className="text-blue-600 mr-3" />
                        Generador de Listados
                    </h1>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">

                    <div className="flex items-center mb-6 border-b border-gray-100 pb-4">
                        <h2 className="text-sm font-bold text-gray-700 flex items-center w-full md:w-1/3">
                            <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-400" /> Tipo de Listado
                        </h2>
                        <select value={tipoListado} onChange={handleTipoChange} className="w-full md:w-2/3 border border-gray-300 rounded-lg p-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-gray-700">
                            <option value="">-- Seleccione el listado a generar --</option>
                            {TIPOS_LISTADO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>

                    {/* RENDERIZADO DINÁMICO DE FILTROS SEGÚN EL TIPO */}
                    {tipoListado && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-5 rounded-lg border border-gray-100">

                            {/* Filtro ÁREAS */}
                            {tipoListado === 'areas' && (
                                <div className="col-span-1 md:col-span-2">
                                    <label className="flex items-center space-x-3 text-sm font-bold text-gray-700 cursor-pointer">
                                        <input type="checkbox" name="incluirAsignaturas" checked={filters.incluirAsignaturas} onChange={handleFilterChange} className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                        <span>Desglosar las Asignaturas de cada Área</span>
                                    </label>
                                    <p className="text-xs text-gray-500 mt-2 ml-8">Si no se marca, el sistema generará únicamente el listado general de las áreas obligatorias y optativas.</p>
                                </div>
                            )}

                            {/* Filtro SEDE (Aplica para Estudiantes, Docentes, Directores) */}
                            {tipoListado !== 'areas' && (
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Sede Educativa</label>
                                    <div className="relative">
                                        <select name="sedeId" value={filters.sedeId} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 pl-8 text-sm outline-none bg-white focus:ring-2 focus:ring-blue-500">
                                            <option value="">-- Seleccione Sede --</option>
                                            {(tipoListado === 'docentes' || tipoListado === 'directores') && (
                                                <option value="TODAS">📚 TODAS LAS SEDES (General)</option>
                                            )}
                                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                        <FontAwesomeIcon icon={faSchool} className="absolute left-3 top-3 text-gray-400" />
                                    </div>
                                </div>
                            )}

                            {/* Filtros RANGOS (Solo para Estudiantes) */}
                            {tipoListado === 'estudiantes' && (
                                <>
                                    {/* BLOQUE DESDE */}
                                    <div className="space-y-4 p-4 border border-blue-100 bg-white rounded-lg shadow-sm">
                                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider"> Rango Inicial (Desde)</h3>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Grado</label>
                                            <select name="gradoId" value={filters.rangoInicial.gradoId} onChange={handleRangoInicialChange} disabled={!filters.sedeId} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100">
                                                <option value="">-- Seleccione --</option>
                                                {gradosSede.map(g => <option key={g.id} value={g.id}>{formatearTextoVisual(g.nombre)}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Grupo</label>
                                            <select name="grupoId" value={filters.rangoInicial.grupoId} onChange={handleRangoInicialChange} disabled={!filters.rangoInicial.gradoId} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100">
                                                <option value="">-- Seleccione --</option>
                                                {gruposIniciales.map(g => <option key={g.id} value={g.id}>{formatearTextoVisual(g.nombre)}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* BLOQUE HASTA */}
                                    <div className="space-y-4 p-4 border border-blue-100 bg-white rounded-lg shadow-sm relative">
                                        {/* Overlay visual */}
                                        {!filters.rangoInicial.grupoId && <div className="absolute inset-0 bg-gray-50 bg-opacity-70 z-10 rounded-lg"></div>}

                                        <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider"> Rango Final (Hasta)</h3>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Grado</label>
                                            <select name="gradoId" value={filters.rangoFinal.gradoId} onChange={handleRangoFinalChange} disabled={!filters.rangoInicial.grupoId} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100">
                                                <option value="">-- Seleccione --</option>
                                                {gradosFinalesDisponibles.map(g => <option key={g.id} value={g.id}>{formatearTextoVisual(g.nombre)}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Grupo</label>
                                            <select name="grupoId" value={filters.rangoFinal.grupoId} onChange={handleRangoFinalChange} disabled={!filters.rangoFinal.gradoId} className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100">
                                                <option value="">-- Seleccione --</option>
                                                {gruposFinales.map(g => <option key={g.id} value={g.id}>{formatearTextoVisual(g.nombre)}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button onClick={clearFilters} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
                            <FontAwesomeIcon icon={faEraser} /> Limpiar
                        </button>

                        <button onClick={handleGenerarPdf} disabled={!isFormComplete || isGenerating} className={`px-5 py-2 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm ${!isFormComplete ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-md active:scale-95'}`}>
                            {isGenerating ? <><FontAwesomeIcon icon={faSpinner} spin /> Procesando...</> : <><FontAwesomeIcon icon={faEye} /> Visualizar PDF</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ListadosPage;