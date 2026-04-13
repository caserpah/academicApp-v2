import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFilePdf, faSchool, faFilter, faDownload, faSpinner, faEraser
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext.jsx";

// Reutilizamos fetcher de catálogos existente para mantener consistencia
import { fetchCalificacionesCatalogs } from "../../api/calificacionesService.js";
import { descargarPlanillaPdf } from "../../api/planillasService.js";

import { showSuccess, showError } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";

const TIPOS_PLANILLA = [
    { id: 'ASISTENCIA', label: 'Asistencia' },
    { id: 'SEGUIMIENTO', label: 'Actividades de Seguimiento' },
    { id: 'CALIFICACIONES', label: 'Calificaciones' },
    { id: 'COMPORTAMIENTO', label: 'Comportamiento (Director de grupo)' }
];

const PlanillasPage = () => {
    const { user } = useAuth();
    const rolUsuario = user?.role || 'docente';

    // Estados de datos
    const [vigencia, setVigencia] = useState(null);
    const [sedes, setSedes] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [gruposDisponibles, setGruposDisponibles] = useState([]);

    // Estado para guardar la carga completa y saber quién es el docente
    const [cargaCompleta, setCargaCompleta] = useState([]);
    const [esAdmin, setEsAdmin] = useState(false);

    // Filtros
    const [filters, setFilters] = useState({
        sedeId: '',
        grupoId: '',
        tipoPlanilla: ''
    });

    // Estados de UI
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    // Carga inicial de catálogos
    useEffect(() => {
        const loadInit = async () => {
            try {
                setLoadingCatalogs(true);
                const data = await fetchCalificacionesCatalogs(rolUsuario);

                setVigencia(data.vigencia);
                setSedes(data.sedes);
                setGrupos(data.grupos);

                setCargaCompleta(data.cargaCompleta || []);
                setEsAdmin(data.esAdmin);

                // Autoseleccionar si solo hay una sede
                if (data.sedes.length === 1) {
                    setFilters(prev => ({ ...prev, sedeId: data.sedes[0].id }));
                }
            } catch (err) {
                console.error("Error cargando datos iniciales:", err);
                showError("No se pudieron cargar los datos iniciales.");
            } finally {
                setLoadingCatalogs(false);
            }
        };
        if (user) loadInit();
    }, [user, rolUsuario]);

    // Cascada: SEDE -> GRUPOS
    useEffect(() => {
        if (!filters.sedeId) {
            setGruposDisponibles([]);
            return;
        }
        const gruposDeLaSede = grupos.filter(g => String(g.sedeId) === String(filters.sedeId));
        setGruposDisponibles(gruposDeLaSede);

        // Reset grupo si no pertenece a la nueva sede
        if (!gruposDeLaSede.find(g => String(g.id) === String(filters.grupoId))) {
            setFilters(prev => ({ ...prev, grupoId: '', tipoPlanilla: '' }));
        }
    }, [filters.sedeId, grupos, filters.grupoId]);

    // Calculamos los tipos de planilla disponibles "al vuelo" basados en el grupo seleccionado
    // Calculamos los tipos de planilla disponibles "al vuelo" basados en el grupo seleccionado
    const tiposPlanillaDisponibles = React.useMemo(() => {
        if (esAdmin) return TIPOS_PLANILLA; // Los admins ven todo

        if (!filters.grupoId) return TIPOS_PLANILLA; // Si no hay grupo, mostramos todo por defecto

        // 1. Filtramos solo la carga académica que el docente tiene en el grupo seleccionado
        const cargaDelGrupo = cargaCompleta.filter(item => String(item.grupo.id) === String(filters.grupoId));

        // 2. Buscamos si dentro de esa carga existe la asignatura "COMPORTAMIENTO"
        const esDirectorDeEsteGrupo = cargaDelGrupo.some(item =>
            item.asignatura &&
            item.asignatura.nombre &&
            item.asignatura.nombre.toUpperCase().includes('COMPORTAMIENTO')
        );

        // Si NO tiene la asignatura comportamiento en este grupo, se la ocultamos del selector
        if (!esDirectorDeEsteGrupo) {
            return TIPOS_PLANILLA.filter(t => t.id !== 'COMPORTAMIENTO');
        }

        return TIPOS_PLANILLA;
    }, [filters.grupoId, esAdmin, cargaCompleta]);

    // Handlers
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const newFilters = { ...prev, [name]: value };

            // Limpieza extra: Si cambia el grupo y tenías "Comportamiento" seleccionado,
            // pero el nuevo grupo no permite comportamiento, resetear el tipo de planilla.
            if (name === 'grupoId' && newFilters.tipoPlanilla === 'COMPORTAMIENTO') {
                // Dejamos que el useMemo de arriba haga su trabajo primero en el próximo render,
                // pero por seguridad limpiamos el select.
                newFilters.tipoPlanilla = '';
            }

            return newFilters;
        });
    };

    const clearFilters = () => {
        setFilters(prev => ({
            sedeId: sedes.length === 1 ? prev.sedeId : '',
            grupoId: '',
            tipoPlanilla: ''
        }));
    };

    const handleGenerarPdf = async () => {
        if (!filters.grupoId || !filters.tipoPlanilla) {
            showError("Por favor seleccione el grupo y el tipo de planilla.");
            return;
        }

        try {
            setIsGenerating(true);
            await descargarPlanillaPdf(filters.grupoId, filters.tipoPlanilla);
            showSuccess("Documento generado y descargado exitosamente.");
        } catch (error) {
            showError(error.message); // Aquí mostrará el error 403 si no es el director
        } finally {
            setIsGenerating(false);
        }
    };

    if (loadingCatalogs) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    const isFormComplete = filters.sedeId && filters.grupoId && filters.tipoPlanilla;

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faFilePdf} className="text-red-500 mr-3" />
                        Generación de Planillas PDF
                    </h1>
                    {vigencia && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                            Año Lectivo: {vigencia.anio}
                        </span>
                    )}
                </div>

                {/* Tarjeta de Filtros */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center">
                        <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-400" />
                        Parámetros de Generación
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* 1. Sede */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Sede</label>
                            <div className="relative">
                                <select
                                    name="sedeId"
                                    value={filters.sedeId}
                                    onChange={handleFilterChange}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 pl-8 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                                >
                                    <option value="">-- Seleccione Sede --</option>
                                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                                <FontAwesomeIcon icon={faSchool} className="absolute left-3 top-3 text-gray-400" />
                            </div>
                        </div>

                        {/* 2. Grupo */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Grupo</label>
                            <select
                                name="grupoId"
                                value={filters.grupoId}
                                onChange={handleFilterChange}
                                disabled={!filters.sedeId}
                                className="w-full border border-gray-300 rounded-lg p-2.5 pl-8 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                            >
                                <option value="">-- Seleccione Grupo --</option>
                                {gruposDisponibles.map(g => (
                                    <option key={g.id} value={g.id}>{g.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Tipo de Planilla */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Tipo de Planilla</label>
                            <select
                                name="tipoPlanilla"
                                value={filters.tipoPlanilla}
                                onChange={handleFilterChange}
                                disabled={!filters.grupoId}
                                className="w-full border border-gray-300 rounded-lg p-2.5 pl-8 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                            >
                                <option value="">-- Seleccione Tipo --</option>
                                {tiposPlanillaDisponibles.map(t => (
                                    <option key={t.id} value={t.id}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Fila de Botones */}
                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faEraser} /> Limpiar
                        </button>

                        <button
                            onClick={handleGenerarPdf}
                            disabled={!isFormComplete || isGenerating}
                            className={`px-5 py-2 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm
                                ${!isFormComplete
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-700 hover:shadow-md active:scale-95'
                                }`}
                        >
                            {isGenerating ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin /> Generando...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faDownload} /> Descargar PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview / Placeholder Info */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4">
                    <div className="bg-blue-100 text-blue-600 p-3 rounded-full shrink-0">
                        <FontAwesomeIcon icon={faFilePdf} className="text-xl" />
                    </div>
                    <div>
                        <h3 className="text-blue-800 font-bold text-sm mb-1">Información de Descarga</h3>
                        <p className="text-blue-600 text-xs leading-relaxed">
                            El documento se generará en formato PDF tamaño Carta/A4 con orientación vertical para facilitar su impresión y llenado a mano. Incluirá automáticamente el encabezado institucional y el listado de los estudiantes matriculados en estado activo.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default PlanillasPage;