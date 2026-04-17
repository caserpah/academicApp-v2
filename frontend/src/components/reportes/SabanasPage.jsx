import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChartLine, faSchool, faFilter, faDownload, faSpinner, faEraser, faInfoCircle
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext.jsx";

// Reutilizamos el fetcher de catálogos
import { fetchCalificacionesCatalogs } from "../../api/calificacionesService.js";
import { descargarSabanaPdf } from "../../api/reportesService.js";

import { showError } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import Swal from "sweetalert2";

const TIPOS_SABANA_BASE = [
    { id: 'SABANA_ASIGNATURA', label: 'Sábana de Asignatura por Periodo' },
    { id: 'SABANA_AREAS', label: 'Sábana de Notas de Áreas (Director de grupo)' },
    { id: 'SABANA_ACUMULADOS', label: 'Sábana de Acumulados por Área (Director de grupo)' }
];

const SabanasPage = () => {
    const { user } = useAuth();
    const rolUsuario = user?.role || 'docente';

    // Estados de datos
    const [vigencia, setVigencia] = useState(null);
    const [sedes, setSedes] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [cargaCompleta, setCargaCompleta] = useState([]);
    const [asignaturasGlobales, setAsignaturasGlobales] = useState([]);
    const [esAdmin, setEsAdmin] = useState(false);

    // Listas dinámicas
    const [gruposDisponibles, setGruposDisponibles] = useState([]);
    const [asignaturasDisponibles, setAsignaturasDisponibles] = useState([]);

    // Filtros seleccionados
    const [filters, setFilters] = useState({
        sedeId: '',
        grupoId: '',
        tipoSabana: '',
        asignaturaId: '',
        periodo: ''
    });

    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // 1. Carga inicial
    useEffect(() => {
        const loadInit = async () => {
            try {
                setLoadingCatalogs(true);
                const data = await fetchCalificacionesCatalogs(rolUsuario);

                setVigencia(data.vigencia);
                setSedes(data.sedes);
                setGrupos(data.grupos);
                setCargaCompleta(data.cargaCompleta || []);
                setAsignaturasGlobales(data.asignaturas || []);
                setEsAdmin(data.esAdmin);

                if (data.sedes.length === 1) {
                    setFilters(prev => ({ ...prev, sedeId: data.sedes[0].id }));
                }
            } catch (err) {
                console.error("Error cargando catálogos para Sábanas:", err);
                showError("No se pudieron cargar los datos iniciales.");
            } finally {
                setLoadingCatalogs(false);
            }
        };
        if (user) loadInit();
    }, [user, rolUsuario]);

    // 2. Cascada SEDE -> GRUPOS
    useEffect(() => {
        if (!filters.sedeId) {
            setGruposDisponibles([]);
            return;
        }
        const gruposDeLaSede = grupos.filter(g => String(g.sedeId) === String(filters.sedeId));
        setGruposDisponibles(gruposDeLaSede);

        if (!gruposDeLaSede.find(g => String(g.id) === String(filters.grupoId))) {
            setFilters(prev => ({ ...prev, grupoId: '', tipoSabana: '', asignaturaId: '', periodo: '' }));
        }
    }, [filters.sedeId, grupos, filters.grupoId]);

    // 3. Reglas de Negocio: Tipos de Sábana y Asignaturas
    const tiposSabanaDisponibles = useMemo(() => {
        if (esAdmin) return TIPOS_SABANA_BASE;
        if (!filters.grupoId) return TIPOS_SABANA_BASE;

        // 1. Filtramos solo la carga académica que el docente tiene en el grupo seleccionado
        const cargaDelGrupo = cargaCompleta.filter(item => String(item.grupo.id) === String(filters.grupoId));

        // 2. Buscamos si dentro de esa carga existe la asignatura "COMPORTAMIENTO" (indicador infalible de que es director)
        const esDirectorDeEsteGrupo = cargaDelGrupo.some(item =>
            item.asignatura &&
            item.asignatura.nombre &&
            item.asignatura.nombre.toUpperCase().includes('COMPORTAMIENTO')
        );

        // Si NO es el director, solo puede ver la Sábana 1 (Asignatura)
        if (!esDirectorDeEsteGrupo) {
            return TIPOS_SABANA_BASE.filter(t => t.id === 'SABANA_ASIGNATURA');
        }

        // Si es director, ve todas las opciones
        return TIPOS_SABANA_BASE;
    }, [filters.grupoId, esAdmin, cargaCompleta]);

    // Llenar asignaturas cuando elige "Sábana de Asignatura"
    useEffect(() => {
        if (filters.tipoSabana !== 'SABANA_ASIGNATURA' || !filters.grupoId) {
            setAsignaturasDisponibles([]);
            return;
        }

        let nuevasAsignaturas = [];
        if (esAdmin) {
            nuevasAsignaturas = asignaturasGlobales;
        } else {
            const filtradas = cargaCompleta
                .filter(item => String(item.grupo.id) === String(filters.grupoId))
                .map(item => item.asignatura);

            // Eliminamos duplicados
            nuevasAsignaturas = [...new Map(filtradas.map(item => [item.id, item])).values()];
        }
        setAsignaturasDisponibles(nuevasAsignaturas);

    }, [filters.grupoId, filters.tipoSabana, esAdmin, cargaCompleta, asignaturasGlobales]);

    // 4. Limpieza dinámica al cambiar de tipo de sábana
    useEffect(() => {
        if (filters.tipoSabana === 'SABANA_ASIGNATURA') {
            setFilters(prev => ({ ...prev, periodo: '' })); // No necesita periodo
        } else if (filters.tipoSabana === 'SABANA_AREAS') {
            setFilters(prev => ({ ...prev, asignaturaId: '' })); // No necesita asignatura
        } else if (filters.tipoSabana === 'SABANA_ACUMULADOS') {
            setFilters(prev => ({ ...prev, asignaturaId: '', periodo: '' })); // No necesita ninguno
        }
    }, [filters.tipoSabana]);


    // Handlers
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const clearFilters = () => {
        setFilters({
            sedeId: sedes.length === 1 ? filters.sedeId : '',
            grupoId: '',
            tipoSabana: '',
            asignaturaId: '',
            periodo: ''
        });
    };

    // Validación de formulario completo
    const isFormComplete = useMemo(() => {
        if (!filters.sedeId || !filters.grupoId || !filters.tipoSabana) return false;
        if (filters.tipoSabana === 'SABANA_ASIGNATURA' && !filters.asignaturaId) return false;
        if (filters.tipoSabana === 'SABANA_AREAS' && !filters.periodo) return false;
        return true;
    }, [filters]);

    const handleGenerarSabana = async () => {
        if (!isFormComplete) return;

        try {
            setIsGenerating(true);
            await descargarSabanaPdf({
                grupoId: filters.grupoId,
                tipoSabana: filters.tipoSabana,
                asignaturaId: filters.asignaturaId || null,
                periodo: filters.periodo || null
            });
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Sábana generada y descargada exitosamente.',
                timer: 3000, // <-- Se cierra solo después de 3 segundos
                showConfirmButton: false
            });
        } catch (error) {
            showError(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    if (loadingCatalogs) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faChartLine} className="text-indigo-600 mr-3" />
                        Reportes y Sábanas Académicas
                    </h1>
                    {vigencia && (
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1 rounded-full">
                            Año Lectivo: {vigencia.anio}
                        </span>
                    )}
                </div>

                {/* Tarjeta de Filtros */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center">
                        <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-400" />
                        Configuración del Reporte
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

                        {/* 1. Sede */}
                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Sede</label>
                            <div className="relative">
                                <select name="sedeId" value={filters.sedeId} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 pl-8 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                    <option value="">-- Sede --</option>
                                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                                <FontAwesomeIcon icon={faSchool} className="absolute left-3 top-3 text-gray-400" />
                            </div>
                        </div>

                        {/* 2. Grupo */}
                        <div className="col-span-1 md:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Grupo</label>
                            <select name="grupoId" value={filters.grupoId} onChange={handleFilterChange} disabled={!filters.sedeId} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100">
                                <option value="">-- Grupo --</option>
                                {gruposDisponibles.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                        </div>

                        {/* 3. Tipo de Sábana */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Tipo de Reporte</label>
                            <select name="tipoSabana" value={filters.tipoSabana} onChange={handleFilterChange} disabled={!filters.grupoId} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100">
                                <option value="">-- Seleccione el reporte --</option>
                                {tiposSabanaDisponibles.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>

                        {/* 4. Filtro Condicional (Asignatura o Periodo) */}
                        <div className="col-span-1 md:col-span-1">
                            {filters.tipoSabana === 'SABANA_ASIGNATURA' ? (
                                <>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Asignatura</label>
                                    <select name="asignaturaId" value={filters.asignaturaId} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        <option value="">-- Asignatura --</option>
                                        {asignaturasDisponibles.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                                    </select>
                                </>
                            ) : filters.tipoSabana === 'SABANA_AREAS' ? (
                                <>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Periodo Evaluado</label>
                                    <select name="periodo" value={filters.periodo} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        <option value="">-- Periodo --</option>
                                        {[1, 2, 3, 4].map(p => <option key={p} value={p}>Periodo {p}</option>)}
                                    </select>
                                </>
                            ) : (
                                <div className="h-full flex items-end pb-1">
                                    <span className="text-xs text-gray-400 italic"><FontAwesomeIcon icon={faInfoCircle} /> Selección automática</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button onClick={clearFilters} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg flex items-center gap-2">
                            <FontAwesomeIcon icon={faEraser} /> Limpiar
                        </button>

                        <button onClick={handleGenerarSabana} disabled={!isFormComplete || isGenerating} className={`px-5 py-2 text-white text-sm font-bold rounded-lg flex items-center gap-2 shadow-sm transition-transform ${!isFormComplete ? 'bg-gray-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}>
                            {isGenerating ? <><FontAwesomeIcon icon={faSpinner} spin /> Procesando Cálculos...</> : <><FontAwesomeIcon icon={faDownload} /> Generar Sábana</>}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SabanasPage;