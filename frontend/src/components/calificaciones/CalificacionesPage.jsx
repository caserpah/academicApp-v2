import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileExcel, faClipboardCheck, faFilter, faDownload,
    faUpload, faSpinner, faSchool, faEraser, faExclamationTriangle
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext.jsx";

import {
    fetchCalificacionesCatalogs,
    fetchGrillaCalificaciones,
    guardarCalificacion,
    fetchBancoRecomendaciones,
    descargarPlantillaDocente,
    checkPendientesDocente,
    checkEstadoVentana
} from "../../api/calificacionesService.js";

import { showSuccess, showError, showWarning } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import GrillaCalificaciones from "./GrillaCalificaciones.jsx";
import JustificacionModal from "./JustificacionModal.jsx";
import CalificacionesImportModal from "./CalificacionesImportModal.jsx"

const CalificacionesPage = () => {
    // --- AUTH CONTEXT ---
    const { user } = useAuth();
    const rolUsuario = user?.role || 'docente';

    // --- ESTADOS DE DATOS ---
    const [vigencia, setVigencia] = useState(null);
    const [sedes, setSedes] = useState([]);
    const [grupos, setGrupos] = useState([]);

    // Estado para el Banco de Frases
    const [bancoRecomendaciones, setBancoRecomendaciones] = useState([]);

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
    const [isDownloading, setIsDownloading] = useState(false);

    // Estados para auditoria (Cambio de calificaciones extemporaneas)
    const [showJustificacionModal, setShowJustificacionModal] = useState(false);
    const [pendingSaveData, setPendingSaveData] = useState(null); // Guarda los datos que fallaron para reintentar

    // Estado del modal para importar calificaciones
    const [showImportModal, setShowImportModal] = useState(false);

    // Estado para alerta de estudiantes con Calificaciones Pendientes
    const [alertaPendientes, setAlertaPendientes] = useState({ show: false, count: 0 });

    // Estado para mostrar el modal con la lista completa de pendientes del docente
    const [showModalPendientes, setShowModalPendientes] = useState(false);

    const [isReadOnly, setIsReadOnly] = useState(false);

    // --- CARGA INICIAL DE CATÁLOGOS ---
    useEffect(() => {
        const loadInit = async () => {
            try {
                setLoadingCatalogs(true);
                // Cargamos catálogos (Sedes, Grupos, Asignaturas)
                const data = await fetchCalificacionesCatalogs(rolUsuario);

                setVigencia(data.vigencia);
                setSedes(data.sedes);
                setGrupos(data.grupos);
                setEsAdmin(data.esAdmin);
                setCargaCompleta(data.cargaCompleta || []);
                setAsignaturasGlobales(data.asignaturas || []);

                // Cargamos el Banco de Recomendaciones
                const bancoData = await fetchBancoRecomendaciones();
                setBancoRecomendaciones(bancoData);

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
    }, [filters.sedeId, grupos, filters.grupoId]);

    // --- EFECTO CASCADA (Al cambiar Grupo -> Filtrar Asignaturas) ---
    useEffect(() => {
        // Si no hay grupo seleccionado, limpiamos asignaturas
        if (!filters.grupoId) {
            setAsignaturasDisponibles([]);
            return;
        }

        let nuevasAsignaturas = [];

        if (esAdmin) {
            nuevasAsignaturas = asignaturasGlobales; // No hay cascada, muestran TODO el catálogo de asignaturas
        } else {
            // Buscamos en 'cargaCompleta' las coincidencias con este grupo (Cascada Estricta)
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

    }, [filters.grupoId, esAdmin, cargaCompleta, asignaturasGlobales, filters.asignaturaId]);

    // --- CARGA DE LA GRILLA (Al completar filtros) ---
    const loadGrilla = useCallback(async () => {
        const { grupoId, asignaturaId, periodo } = filters;

        if (!grupoId || !asignaturaId || !periodo || !vigencia?.id) {
            setStudentsData([]);
            setAlertaPendientes({ show: false, data: null });
            setIsReadOnly(false); // Limpiamos la alerta
            return;
        }

        try {
            setLoadingGrilla(true);

            // --- 1. PRE-CHECK: VERIFICAR VENTANA ---
            const estadoVentana = await checkEstadoVentana(periodo);

            // Usamos una variable local para el flujo actual
            let isCurrentlyReadOnly = false;

            // Si está cerrada y NO es admin (los admins pueden editar extemporáneo)
            if (!estadoVentana.abierta && !esAdmin) {
                showWarning("El periodo está cerrado. La planilla se muestra en modo Solo Lectura.");
                setIsReadOnly(true);
                isCurrentlyReadOnly = true;
            } else {
                setIsReadOnly(false);
            }

            // --- 2. CARGAR NOTAS
            const data = await fetchGrillaCalificaciones({ ...filters, vigenciaId: vigencia.id });
            setStudentsData(data);

            // --- 3. CHECK DE VUELO DEL DOCENTE (SOLO SI NO ES LECTURA) ---
            // Si el periodo es mayor a 1 Y la ventana está abierta (o es admin), verificamos pendientes
            if (parseInt(periodo) > 1 && !isCurrentlyReadOnly) {
                const auditoria = await checkPendientesDocente({ grupoId, asignaturaId, periodo });
                if (auditoria.hayPendientes) {
                    setAlertaPendientes({ show: true, data: auditoria });
                } else {
                    setAlertaPendientes({ show: false, data: null });
                }
            } else {
                // Si es periodo 1 o estamos en modo Solo Lectura, ocultamos la alerta
                setAlertaPendientes({ show: false, data: null });
            }
        } catch (err) {
            showError("Error al cargar la planilla de calificaciones.");
            console.error(err);
        } finally {
            setLoadingGrilla(false);
        }
    }, [filters, vigencia, esAdmin]);

    // Ejecutar carga cuando cambien los filtros completos
    useEffect(() => {
        loadGrilla();
    }, [loadGrilla]);

    // --- HANDLERS ---
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    /**
     * Función para limpiar filtros
     */
    const clearFilters = () => {
        setFilters(prev => ({
            sedeId: sedes.length === 1 ? prev.sedeId : '',
            grupoId: '',
            asignaturaId: '',
            periodo: ''
        }));
        setStudentsData([]); // Limpiamos la grilla visualmente también
    };

    /**
     * Función que se pasa al hijo (Grilla) para guardar
     */
    const handleSaveCalificacion = async (calificacionData) => { //Guardado Automático (OnBlur)
        return await guardarCalificacion({
            ...calificacionData,
            asignaturaId: filters.asignaturaId,
            periodo: filters.periodo,
            vigenciaId: vigencia.id
        });
    };

    // Solicitud de Guardado Manual (Botón Naranja)
    const handleManualSaveRequest = (calificacionData) => {
        // Guardamos los datos pendientes y abrimos el modal
        setPendingSaveData({
            ...calificacionData,
            asignaturaId: filters.asignaturaId,
            periodo: filters.periodo,
            vigenciaId: vigencia.id
        });
        setShowJustificacionModal(true);
    };

    /**
     * Handler para cuando el usuario confirma el Modal de Justificación
     * Recibe: (observacion, archivoEvidencia)
     */
    const handleConfirmJustificacion = async (observacion, archivoEvidencia) => {
        if (!pendingSaveData) return;

        try {
            setShowJustificacionModal(false); // Cerramos modal primero

            // Reintentamos guardar INYECTANDO la justificación y el archivo
            await guardarCalificacion({
                ...pendingSaveData,
                observacion_cambio: observacion,
                evidencia: archivoEvidencia
            });

            showSuccess("Cambio guardado con observación exitosamente.", "success");

            // Limpiamos
            setPendingSaveData(null);

            // Refrescamos la grilla para asegurar consistencia
            loadGrilla();

        } catch (error) {
            showError(error.message);
            // Si falla de nuevo, el usuario tendrá que intentar editar otra vez
        }
    };

    // --- HANDLER: DESCARGA GLOBAL DOCENTE ---
    const handleDescargarPlantilla = async () => {
        if (!filters.periodo) {
            showWarning("Por favor seleccione un periodo para descargar la planilla.");
            return;
        }

        try {
            setIsDownloading(true); // Iniciamos el Spinner

            // Llama al nuevo servicio que descarga TODO el libro del docente para ese periodo
            await descargarPlantillaDocente(filters.periodo);
            showSuccess("Descarga iniciada. Revisa tus descargas.");
        } catch (error) {
            console.log(error)
            showError("Error al generar la plantilla. Verifica tu carga académica.");
        } finally {
            setIsDownloading(false); // Detenemos el Spinner (incluso si hay error)
        }
    };

    // HANDLER PARA DESCARGAR EL REPORTE DE PENDIENTES (Docentes)
    /*const handleDownloadReportePendientes = async () => {
        try {
            if (!vigencia?.id) return;
            // Podrías poner un loading aquí si quieres
            await descargarReportePendientes(vigencia.id);
            showSuccess("Reporte descargado correctamente.");
        } catch (error) {
            console.log(error)
            showError("No se encontraron pendientes para descargar.");
        }
    };*/

    // --- RENDER ---
    if (loadingCatalogs) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-full mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center pb-4">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faClipboardCheck} className="text-blue-600" />
                        Registro de Calificaciones
                    </h1>
                    {vigencia && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                            Año Lectivo: {vigencia.anio} {esAdmin && '(Administrador)'}
                        </span>
                    )}
                </div>

                {/* Filtros: Ahora son 4 Columnas */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                        {/* 1. Sede (md:col-span-3) */}
                        <div className="md:col-span-3">
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

                        {/* 2. Grupo (md:col-span-3) */}
                        <div className="md:col-span-3">
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

                        {/* 3. Asignatura (md:col-span-3) */}
                        <div className="md:col-span-3">
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

                        {/* 4. Periodo (md:col-span-2) */}
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Periodo</label>
                            <select
                                name="periodo"
                                value={filters.periodo}
                                onChange={handleFilterChange}
                                disabled={!filters.asignaturaId}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors "
                            >
                                <option value="">-- Seleccione --</option>
                                {[1, 2, 3, 4].map(p => <option key={p} value={p}>Periodo {p}</option>)}
                            </select>
                        </div>

                        {/* 5. Botón Limpiar (md:col-span-1) */}
                        <div className="md:col-span-1 flex justify-center md:justify-end">
                            <button
                                onClick={clearFilters}
                                title="Limpiar filtros"
                                className="w-full md:w-auto h-[42px] px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg border border-gray-300 transition-colors flex items-center justify-center gap-2"
                            >
                                <FontAwesomeIcon icon={faEraser} />
                            </button>
                        </div>

                    </div>
                </div>

                {/* --- 6. ACCIONES GLOBALES (DESCARGAR / IMPORTAR) --- */}
                {rolUsuario === 'docente' && (
                    <div className="flex flex-wrap justify-end gap-3 p-2 bg-blue-50/50 rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 mr-auto text-sm text-blue-800 px-2">
                            <FontAwesomeIcon icon={faFileExcel} />
                            <span className="font-semibold">Gestión Masiva de Notas (Excel)</span>
                        </div>

                        {/* Botón Descargar (SIEMPRE DISPONIBLE si hay periodo, sin importar isReadOnly) */}
                        <button
                            onClick={handleDescargarPlantilla}
                            disabled={!filters.periodo || isDownloading}
                            className={`px-4 py-2 rounded-lg shadow-sm text-sm font-bold flex items-center gap-2 transition-all
                            ${!filters.periodo
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 hover:shadow-md'
                                }`}
                            title={!filters.periodo ? "Selecciona un periodo primero" : "Descargar planilla completa con todas tus asignaturas"}
                        >
                            {/* Alternamos el ícono y el texto del botón */}
                            {isDownloading ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    Generando Excel...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faDownload} />
                                    Descargar Mi Planilla
                                </>
                            )}
                        </button>

                        {/* Botón Importar (SOLO SE MUESTRA SI LA VENTANA ESTÁ ABIERTA) */}
                        {!isReadOnly && (
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2 px-5 rounded-lg shadow-sm flex items-center gap-2 transition-all hover:shadow-md"
                                title="Subir archivo con múltiples hojas"
                            >
                                <FontAwesomeIcon icon={faUpload} />
                                Subir Planilla
                            </button>
                        )}
                    </div>
                )}

                {/* ALERTA DE NOTAS PENDIENTES */}
                {alertaPendientes.show && alertaPendientes.data && (
                    <div className="mb-4 p-4 bg-orange-50 border-l-4 border-orange-500 rounded-r-lg shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <FontAwesomeIcon icon={faExclamationTriangle} className="text-orange-500 mt-1" />
                            <div>
                                <h4 className="text-sm font-bold text-orange-800">
                                    ¡Atención! Tienes estudiantes con notas pendientes en periodos anteriores.
                                </h4>
                                <p className="text-xs text-orange-700 mt-0.5">
                                    Se detectaron <strong>{alertaPendientes.data.totalFaltantes}</strong> calificaciones en blanco
                                    distribuidas en <strong>{alertaPendientes.data.totalEstudiantes}</strong> estudiantes.
                                </p>
                            </div>
                        </div>

                        {/* BOTÓN PARA VER LISTA COMPLETA */}
                        <button
                            onClick={() => setShowModalPendientes(true)}
                            className="whitespace-nowrap text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded shadow-sm transition-colors focus:ring-2 focus:ring-orange-300"
                        >
                            Ver listado completo
                        </button>
                    </div>
                )}

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
                            onManualSave={handleManualSaveRequest}
                            asignaturaNombre={asignaturasDisponibles.find(a => String(a.id) === String(filters.asignaturaId))?.nombre || ""}
                            porcentajeArea={asignaturasDisponibles.find(a => String(a.id) === String(filters.asignaturaId))?.porcentual || 100}
                            bancoRecomendaciones={bancoRecomendaciones}
                            isReadOnly={isReadOnly}
                            isAdmin={esAdmin}
                        />
                    )}
                </div>

                {/* --- MODAL JUSTIFICACIÓN CAMBIO DE CALIFICACIÓN EXTEMPORANEA --- */}
                <JustificacionModal
                    isOpen={showJustificacionModal}
                    onClose={() => {
                        setShowJustificacionModal(false);
                        setPendingSaveData(null); // Cancelamos el intento
                    }}
                    onConfirm={handleConfirmJustificacion}
                    initialObservacion={pendingSaveData?.observacion_cambio}
                    initialUrl={pendingSaveData?.url_evidencia_cambio}
                />

                {/* --- MODAL PARA EXPORTAR CALIFICACIONES --- */}
                {showImportModal && (
                    <CalificacionesImportModal
                        onClose={() => setShowImportModal(false)}
                        onSuccess={() => {
                            // Si el usuario tiene filtros activos, recargamos la grilla para ver los cambios
                            if (filters.grupoId && filters.asignaturaId && filters.periodo) {
                                loadGrilla();
                            }
                        }}
                    />
                )}

            </div>

            {/* ========================================================= */}
            {/* MODAL PARA DOCENTES: LISTA COMPLETA DE PENDIENTES         */}
            {/* ========================================================= */}
            {showModalPendientes && alertaPendientes.data && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border-t-4 border-orange-500">
                        <div className="p-4 border-b border-gray-100 bg-orange-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-orange-500" />
                                Estudiantes con notas pendientes
                            </h3>
                            <button onClick={() => setShowModalPendientes(false)} className="text-gray-400 hover:text-red-500">
                                <FontAwesomeIcon icon="times" />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Documento</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Estudiante</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Asignatura</th>
                                            <th className="px-4 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Periodos Pendientes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                        {alertaPendientes.data.detalles.map((item, index) => (
                                            <tr key={index} className="hover:bg-orange-50/50 transition-colors">
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-500">{item.documento}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-800 font-medium">{item.nombreCompleto}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-600">{item.asignatura}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-center font-bold text-orange-600">
                                                    {item.periodosFaltantes}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-300 flex justify-end">
                            <button
                                onClick={() => setShowModalPendientes(false)}
                                className="bg-red-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 flex items-center hover:scale-[1.01]"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalificacionesPage;