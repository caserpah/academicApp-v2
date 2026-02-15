import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClipboardCheck, faFilter, faSpinner, faSchool } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext.jsx";

import {
    fetchCalificacionesCatalogs,
    fetchGrillaCalificaciones,
    guardarCalificacion
} from "../../api/calificacionesService.js";

import { showError } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import GrillaCalificaciones from "./GrillaCalificaciones.jsx";

const CalificacionesPage = () => {
    // --- AUTH CONTEXT ---
    const { user } = useAuth();
    const rolUsuario = user?.role || 'docente';

    // --- ESTADOS DE DATOS ---
    const [vigencia, setVigencia] = useState(null);
    const [sedes, setSedes] = useState([]);
    const [grupos, setGrupos] = useState([]);

    // Estados para lógica de filtros
    const [esAdmin, setEsAdmin] = useState(false);
    const [cargaCompleta, setCargaCompleta] = useState([]);      // Para Docentes
    const [asignaturasGlobales, setAsignaturasGlobales] = useState([]); // Para Admins
    const [gruposDisponibles, setGruposDisponibles] = useState([]);
    const [asignaturasDisponibles, setAsignaturasDisponibles] = useState([]); // Las que se muestran en el select

    // Filtros Seleccionados
    const [filters, setFilters] = useState({
        sedeId: '',
        grupoId: '',
        asignaturaId: '',
        periodo: ''
    });

    // Estado de la Grilla (Estudiantes y notas)
    const [studentsData, setStudentsData] = useState([]);

    // Estados de UI (Loading)
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [loadingGrilla, setLoadingGrilla] = useState(false);

    // --- CARGA INICIAL DE CATÁLOGOS ---
    useEffect(() => {
        const loadInit = async () => {
            try {
                setLoadingCatalogs(true);
                // El servicio decide qué traer según el rol
                const data = await fetchCalificacionesCatalogs(rolUsuario);

                setVigencia(data.vigencia);
                setSedes(data.sedes);
                setGrupos(data.grupos);
                setEsAdmin(data.esAdmin);
                setCargaCompleta(data.cargaCompleta || []);
                setAsignaturasGlobales(data.asignaturas || []);

                // Si solo hay una sede, seleccionarla por defecto
                if (data.sedes.length === 1) {
                    setFilters(prev => ({ ...prev, sedeId: data.sedes[0].id }));
                }

            } catch (err) {
                showError("No se pudieron cargar los datos iniciales.");
                console.error(err);
            } finally {
                setLoadingCatalogs(false);
            }
        };

        if (user) loadInit();
    }, [user, rolUsuario]);

    // CASCADA: SEDE -> GRUPOS
    useEffect(() => {
        if (!filters.sedeId) {
            setGruposDisponibles([]);
            return;
        }

        // Filtramos los grupos que pertenecen a la sede seleccionada
        const gruposDeLaSede = grupos.filter(g => String(g.sedeId) === String(filters.sedeId));
        setGruposDisponibles(gruposDeLaSede);

        // Si el grupo seleccionado no pertenece a la nueva sede, resetearlo
        const grupoValido = gruposDeLaSede.find(g => String(g.id) === String(filters.grupoId));
        if (!grupoValido) {
            setFilters(prev => ({ ...prev, grupoId: '', asignaturaId: '' }));
        }
    }, [filters.sedeId, grupos]);

    // --- EFECTO CASCADA (Al cambiar Grupo -> Filtrar Asignaturas) ---
    useEffect(() => {
        // Si no hay grupo seleccionado, limpiamos asignaturas
        if (!filters.grupoId) {
            setAsignaturasDisponibles([]);
            return;
        }

        let nuevasAsignaturas = [];

        if (esAdmin) {
            // LÓGICA ADMIN: No hay cascada, muestran TODO el catálogo de asignaturas
            nuevasAsignaturas = asignaturasGlobales;
        } else {
            // LÓGICA DOCENTE (Cascada Estricta):
            // Buscamos en 'cargaCompleta' las coincidencias con este grupo
            const filtradas = cargaCompleta
                .filter(item => String(item.grupo.id) === String(filters.grupoId))
                .map(item => item.asignatura);

            // Eliminamos duplicados visuales
            const unicas = [...new Map(filtradas.map(item => [item.id, item])).values()];
            nuevasAsignaturas = unicas;
        }

        setAsignaturasDisponibles(nuevasAsignaturas);

        // Reset asignatura si no es válida
        const valida = nuevasAsignaturas.find(a => String(a.id) === String(filters.asignaturaId));
        if (!valida) {
            setFilters(prev => ({ ...prev, asignaturaId: '' }));
        }

    }, [filters.grupoId, esAdmin, cargaCompleta, asignaturasGlobales]);

    // --- CARGA DE LA GRILLA (Al completar filtros) ---
    const loadGrilla = useCallback(async () => {
        const { grupoId, asignaturaId, periodo } = filters;

        if (!grupoId || !asignaturaId || !periodo || !vigencia?.id) {
            setStudentsData([]); // Limpiar si faltan datos
            return;
        }

        try {
            setLoadingGrilla(true);
            const data = await fetchGrillaCalificaciones({ ...filters, vigenciaId: vigencia.id });
            setStudentsData(data);
        } catch (err) {
            showError("Error al cargar la planilla de calificaciones.");
            console.error(err);
        } finally {
            setLoadingGrilla(false);
        }
    }, [filters, vigencia]);

    // Ejecutar carga cuando cambien los filtros completos
    useEffect(() => {
        loadGrilla();
    }, [loadGrilla]);

    // --- HANDLERS ---
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    /**
     * Función que se pasa al hijo (Grilla) para guardar
     */
    const handleSaveCalificacion = async (calificacionData) => {
        try {
            await guardarCalificacion({
                ...calificacionData,
                asignaturaId: filters.asignaturaId,
                periodo: filters.periodo,
                vigenciaId: vigencia.id
            });
        } catch (error) {
            showError(error.message);
            throw error;
        }
    };

    // --- RENDER ---
    if (loadingCatalogs) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-full mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center border-b pb-4">
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
                        <FontAwesomeIcon icon={faClipboardCheck} className="text-blue-600" />
                        Registro de Calificaciones
                    </h1>
                    {vigencia && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                            {vigencia.anio} {esAdmin && '(Admin)'}
                        </span>
                    )}
                </div>

                {/* Filtros: Ahora son 4 Columnas */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">

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

                    {/* 2. Grupo (Filtrado y con nombre bonito) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Grupo</label>
                        <select
                            name="grupoId"
                            value={filters.grupoId}
                            onChange={handleFilterChange}
                            disabled={!filters.sedeId}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                        >
                            <option value="">-- Seleccione Grupo --</option>
                            {gruposDisponibles.map(g => (
                                <option key={g.id} value={g.id}>{g.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Asignatura */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Asignatura</label>
                        <select
                            name="asignaturaId"
                            value={filters.asignaturaId}
                            onChange={handleFilterChange}
                            disabled={!filters.grupoId}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                        >
                            <option value="">-- Seleccione Asignatura --</option>
                            {asignaturasDisponibles.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* 4. Periodo */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Periodo</label>
                        <select
                            name="periodo"
                            value={filters.periodo}
                            onChange={handleFilterChange}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">-- Seleccione --</option>
                            {[1, 2, 3, 4].map(p => <option key={p} value={p}>Periodo {p}</option>)}
                        </select>
                    </div>

                </div>

                {/* Grilla */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden min-h-[400px]">
                    {!filters.grupoId || !filters.asignaturaId || !filters.periodo ? (
                        <div className="flex flex-col items-center justify-center h-80 text-gray-400 bg-gray-50">
                            <FontAwesomeIcon icon={faFilter} className="text-5xl mb-4 opacity-20" />
                            <p className="font-medium">Seleccione todos los filtros para visualizar la planilla.</p>
                            {loadingGrilla && <span className="mt-2 text-blue-500"><FontAwesomeIcon icon={faSpinner} spin /> Cargando...</span>}
                        </div>
                    ) : (
                        <GrillaCalificaciones
                            students={studentsData}
                            loading={loadingGrilla}
                            onSave={handleSaveCalificacion}
                            asignaturaNombre={asignaturasDisponibles.find(a => String(a.id) === String(filters.asignaturaId))?.nombre || ""}
                        />
                    )}
                </div>

            </div>
        </div>
    );
};

export default CalificacionesPage;