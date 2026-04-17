import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFilePdf, faSchool, faFilter, faDownload, faSpinner, faEraser, faUsersCog
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext.jsx";

import { fetchCalificacionesCatalogs } from "../../api/calificacionesService.js";
import { descargarPlanillaPdf } from "../../api/planillasService.js";
import { fetchDocentesData } from "../../api/docentesService.js";

import { showError } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import Swal from "sweetalert2";

const TIPOS_PLANILLA = [
    { id: 'ASISTENCIA', label: 'Asistencia' },
    { id: 'SEGUIMIENTO', label: 'Actividades de Seguimiento' },
    { id: 'CALIFICACIONES', label: 'Calificaciones' },
    { id: 'COMPORTAMIENTO', label: 'Comportamiento (Director de grupo)' }
];

const PlanillasPage = () => {
    const { user } = useAuth();
    const rolUsuario = user?.role || 'docente';

    const [vigencia, setVigencia] = useState(null);
    const [sedes, setSedes] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [gruposDisponibles, setGruposDisponibles] = useState([]);
    const [docentes, setDocentes] = useState([]);
    const [cargaCompleta, setCargaCompleta] = useState([]);
    const [esAdmin, setEsAdmin] = useState(false);

    const [modoGeneracion, setModoGeneracion] = useState('MASIVO'); // 'GRUPO' o 'MASIVO'

    const [filters, setFilters] = useState({
        sedeId: '', grupoId: '', tipoPlanilla: '', docenteId: '', periodo: ''
    });

    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

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

                if (data.esAdmin) {
                    try {
                        const resDocentes = await fetchDocentesData({ limit: 500 });
                        setDocentes(resDocentes.docentesData.items || []);
                    } catch (e) { console.warn("No se pudo cargar docentes", e); }
                }

                if (data.sedes.length === 1) setFilters(prev => ({ ...prev, sedeId: data.sedes[0].id }));
            } catch (err) {
                console.error("Error cargando catálogos para planillas:", err);
                showError("Error cargando datos.");
            }
            finally { setLoadingCatalogs(false); }
        };
        if (user) loadInit();
    }, [user, rolUsuario]);

    useEffect(() => {
        if (!filters.sedeId) { setGruposDisponibles([]); return; }
        const gruposSede = grupos.filter(g => String(g.sedeId) === String(filters.sedeId));
        setGruposDisponibles(gruposSede);
        if (!gruposSede.find(g => String(g.id) === String(filters.grupoId))) setFilters(prev => ({ ...prev, grupoId: '', tipoPlanilla: '' }));
    }, [filters.sedeId, grupos, filters.grupoId]);

    const tiposPlanillaDisponibles = React.useMemo(() => {
        if (esAdmin) return TIPOS_PLANILLA;

        // En modo masivo, el docente ve los tipos basados en TODA su carga
        if (modoGeneracion === 'MASIVO') {
            const esDirectorEnAlgunGrupo = cargaCompleta.some(item => item.asignatura?.nombre?.toUpperCase().includes('COMPORTAMIENTO'));
            return esDirectorEnAlgunGrupo ? TIPOS_PLANILLA : TIPOS_PLANILLA.filter(t => t.id !== 'COMPORTAMIENTO');
        }

        // En modo grupo, valida según el grupo seleccionado
        if (!filters.grupoId) return TIPOS_PLANILLA;
        const cargaDelGrupo = cargaCompleta.filter(item => String(item.grupo.id) === String(filters.grupoId));
        const esDirectorDeEsteGrupo = cargaDelGrupo.some(item => item.asignatura?.nombre?.toUpperCase().includes('COMPORTAMIENTO'));

        return esDirectorDeEsteGrupo ? TIPOS_PLANILLA : TIPOS_PLANILLA.filter(t => t.id !== 'COMPORTAMIENTO');
    }, [filters.grupoId, esAdmin, cargaCompleta, modoGeneracion]);

    const handleModoChange = (modo) => {
        setModoGeneracion(modo);
        setFilters(prev => ({ ...prev, grupoId: '', docenteId: '', periodo: '', tipoPlanilla: '' }));
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => setFilters(prev => ({ sedeId: sedes.length === 1 ? prev.sedeId : '', grupoId: '', docenteId: '', periodo: '', tipoPlanilla: '' }));

    const handleGenerarPdf = async () => {
        try {
            setIsGenerating(true);
            const dataToApi = { ...filters };
            if (modoGeneracion === 'MASIVO') dataToApi.modoMasivo = true; // Inyectamos el flag para el Backend

            await descargarPlanillaPdf(dataToApi);
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Planilla generada exitosamente.',
                timer: 3000, // <-- Se cierra solo después de 3 segundos
                showConfirmButton: false
            });
        } catch (error) { showError(error.message); }
        finally { setIsGenerating(false); }
    };

    if (loadingCatalogs) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    const isFormComplete = modoGeneracion === 'GRUPO'
        ? (filters.sedeId && filters.grupoId && filters.tipoPlanilla)
        : ((esAdmin ? filters.docenteId : true) && filters.periodo && filters.tipoPlanilla);

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

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">

                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-gray-700 flex items-center">
                            <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-400" /> Parámetros de Generación
                        </h2>

                        {/* EL TABS DE MODO AHORA ESTÁ DISPONIBLE PARA TODOS */}
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => handleModoChange('GRUPO')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${modoGeneracion === 'GRUPO' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Por Grupo</button>
                            <button onClick={() => handleModoChange('MASIVO')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${modoGeneracion === 'MASIVO' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>
                                <FontAwesomeIcon icon={faUsersCog} /> {esAdmin ? 'Masiva (Por Docente)' : 'Masiva (Mis Clases)'}
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {modoGeneracion === 'GRUPO' ? (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Sede</label>
                                    <div className="relative">
                                        <select name="sedeId" value={filters.sedeId} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 pl-8 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500">
                                            <option value="">-- Seleccione Sede --</option>
                                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                        <FontAwesomeIcon icon={faSchool} className="absolute left-3 top-3 text-gray-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Grupo</label>
                                    <select name="grupoId" value={filters.grupoId} onChange={handleFilterChange} disabled={!filters.sedeId} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100">
                                        <option value="">-- Seleccione Grupo --</option>
                                        {gruposDisponibles.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                {esAdmin && (
                                    <div className="col-span-1 md:col-span-1">
                                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Docente</label>
                                        <select name="docenteId" value={filters.docenteId} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100">
                                            <option value="">-- Seleccione Docente --</option>
                                            {docentes.map(d => <option key={d.id} value={d.id}>{d.identidad?.nombre} {d.identidad?.apellidos}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Periodo a Evaluar</label>
                                    <select name="periodo" value={filters.periodo} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500">
                                        <option value="">-- Periodo --</option>
                                        {[1, 2, 3, 4].map(p => <option key={p} value={p}>Periodo {p}</option>)}
                                    </select>
                                </div>
                            </>
                        )}

                        {/* El Tipo de Planilla siempre es visible y seleccionable */}
                        <div className={modoGeneracion === 'MASIVO' && esAdmin ? '' : 'col-span-1 md:col-span-1'}>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Tipo de Planilla</label>
                            <select name="tipoPlanilla" value={filters.tipoPlanilla} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none bg-white focus:ring-2 focus:ring-indigo-500">
                                <option value="">-- Seleccione Tipo --</option>
                                {tiposPlanillaDisponibles.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button onClick={clearFilters} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2">
                            <FontAwesomeIcon icon={faEraser} /> Limpiar
                        </button>

                        <button onClick={handleGenerarPdf} disabled={!isFormComplete || isGenerating} className={`px-5 py-2 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm ${!isFormComplete ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-md active:scale-95'}`}>
                            {isGenerating ? <><FontAwesomeIcon icon={faSpinner} spin /> Generando...</> : <><FontAwesomeIcon icon={faDownload} /> Descargar PDF</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanillasPage;