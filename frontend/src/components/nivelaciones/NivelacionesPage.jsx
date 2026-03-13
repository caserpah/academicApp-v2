import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSchool, faEraser, faCogs, faExclamationTriangle, faDownload } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext.jsx";

// Reutilizamos el cargador de catálogos del módulo de calificaciones,
// ya que necesitamos vigencia, sedes, grupos y asignaturas para los filtros.
import { fetchCalificacionesCatalogs } from "../../api/calificacionesService.js";

import { fetchPendientesNivelacion, generarConsolidadosMasivos } from "../../api/nivelacionesService.js";

import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";
import GrillaNivelaciones from "./GrillaNivelaciones.jsx";

const NivelacionesPage = () => {
    const { user } = useAuth();
    const rolUsuario = user?.role || 'docente';

    // Estados de Catálogos (Reutilizados)
    const [vigencia, setVigencia] = useState(null);
    const [sedes, setSedes] = useState([]);
    const [grupos, setGrupos] = useState([]);

    // Estados Lógicos
    const [esAdmin, setEsAdmin] = useState(false);
    const [cargaCompleta, setCargaCompleta] = useState([]);
    const [asignaturasGlobales, setAsignaturasGlobales] = useState([]);
    const [gruposDisponibles, setGruposDisponibles] = useState([]);
    const [asignaturasDisponibles, setAsignaturasDisponibles] = useState([]);

    // Estado para reporte de notas faltantes (check de vuelo)
    const [reporteFaltantes, setReporteFaltantes] = useState(null);

    // Filtros Seleccionados (SIN PERIODO)
    const [filters, setFilters] = useState({
        sedeId: '',
        grupoId: '',
        asignaturaId: ''
    });

    // Estado de la Grilla y UI
    const [studentsData, setStudentsData] = useState([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [loadingGrilla, setLoadingGrilla] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // --- CARGA INICIAL DE CATÁLOGOS ---
    useEffect(() => {
        const loadInit = async () => {
            try {
                setLoadingCatalogs(true);
                const data = await fetchCalificacionesCatalogs(rolUsuario);

                setVigencia(data.vigencia);
                setSedes(data.sedes);
                setGrupos(data.grupos);
                setEsAdmin(data.esAdmin);
                setCargaCompleta(data.cargaCompleta || []);
                setAsignaturasGlobales(data.asignaturas || []);

                if (data.sedes.length === 1) {
                    setFilters(prev => ({ ...prev, sedeId: data.sedes[0].id }));
                }
            } catch (err) {
                showError("No se pudieron cargar los catálogos.");
                console.error(err);
            } finally {
                setLoadingCatalogs(false);
            }
        };
        if (user) loadInit();
    }, [user, rolUsuario]);

    // --- CASCADA: SEDE -> GRUPOS ---
    useEffect(() => {
        if (!filters.sedeId) {
            setGruposDisponibles([]);
            return;
        }
        const gruposDeLaSede = grupos.filter(g => String(g.sedeId) === String(filters.sedeId));
        setGruposDisponibles(gruposDeLaSede);

        const grupoValido = gruposDeLaSede.find(g => String(g.id) === String(filters.grupoId));
        if (!grupoValido) {
            setFilters(prev => ({ ...prev, grupoId: '', asignaturaId: '' }));
        }
    }, [filters.sedeId, grupos, filters.grupoId]);

    // --- CASCADA: GRUPO -> ASIGNATURAS ---
    useEffect(() => {
        if (!filters.grupoId) {
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
            nuevasAsignaturas = [...new Map(filtradas.map(item => [item.id, item])).values()];
        }

        setAsignaturasDisponibles(nuevasAsignaturas);

        const valida = nuevasAsignaturas.find(a => String(a.id) === String(filters.asignaturaId));
        if (!valida) {
            setFilters(prev => ({ ...prev, asignaturaId: '' }));
        }
    }, [filters.grupoId, esAdmin, cargaCompleta, asignaturasGlobales, filters.asignaturaId]);

    // --- CARGAR GRILLA ---
    const loadGrilla = useCallback(async () => {
        const { grupoId, asignaturaId } = filters;
        if (!grupoId || !asignaturaId || !vigencia?.id) {
            setStudentsData([]);
            return;
        }

        try {
            setLoadingGrilla(true);
            const data = await fetchPendientesNivelacion({ grupoId, asignaturaId });
            setStudentsData(data);
        } catch (err) {
            console.error(err);
            showError("Error al cargar los estudiantes pendientes de nivelar.");
        } finally {
            setLoadingGrilla(false);
        }
    }, [filters, vigencia]);

    useEffect(() => {
        loadGrilla();
    }, [loadGrilla]);

    // --- HANDLERS ---
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const clearFilters = () => {
        setFilters(prev => ({
            sedeId: sedes.length === 1 ? prev.sedeId : '',
            grupoId: '',
            asignaturaId: ''
        }));
        setStudentsData([]);
    };

    // --- BOTÓN ADMINISTRATIVO: GENERAR CONSOLIDADOS ---
    const handleGenerarConsolidados = async (forzar = false) => {

        // Si 'forzar' es el evento de React (un objeto), lo convertimos en false.
        const forzarCierreReal = typeof forzar === 'boolean' ? forzar : false;

        if (!filters.sedeId || !filters.grupoId) {
            showWarning("Debe seleccionar una Sede y un Grupo para realizar el cierre de año.");
            return;
        }

        const grupoInfo = gruposDisponibles.find(g => String(g.id) === String(filters.grupoId));
        if (!grupoInfo || !grupoInfo.gradoId) {
            showError("No se pudo determinar el Grado del grupo seleccionado.");
            return;
        }

        // Solo pedimos confirmación normal si NO estamos forzando
        if (!forzarCierreReal) {
            const confirm = await showConfirm(
                `¿Está seguro de Generar Consolidados (Cierre de Año) para el grupo ${grupoInfo.label}? Esta acción calculará los promedios finales y determinará qué estudiantes deben nivelar.`,
                "Confirmar Cierre de Año"
            );
            if (!confirm) return;
        }

        try {
            setIsGenerating(true);
            const res = await generarConsolidadosMasivos({
                sedeId: filters.sedeId,
                gradoId: grupoInfo.gradoId,
                grupoId: filters.grupoId,
                vigenciaId: vigencia?.id,
                forzarCierre: forzarCierreReal
            });

            // Si el backend nos responde con un WARNING (Faltan notas)
            if (res.status === 'warning') {
                setReporteFaltantes(res.data); // Guardamos la lista de faltantes para mostrar el modal
                showWarning(res.message);
                return; // Detenemos el flujo, no recargamos la grilla
            }

            // Si fue un éxitoso total, mostramos el mensaje y recargamos la grilla
            showSuccess(res.message || `Cierre exitoso. ${res.data?.procesados || 0} registros generados.`);
            setReporteFaltantes(null); // Limpiamos el reporte si lo había

            // Si teníamos una asignatura seleccionada, recargamos la grilla para ver quién perdió
            if (filters.asignaturaId) loadGrilla();

        } catch (error) {
            showError(error.message || "Fallo al generar consolidados.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- BOTÓN EXCEL: DESCARGAR REPORTE DE FALTANTES ---
    const descargarReporteExcel = () => {
        if (!reporteFaltantes || reporteFaltantes.length === 0) return;

        // 1. Obtener los nombres reales de la Sede y el Grupo desde los estados
        const sedeInfo = sedes?.find(s => String(s.id) === String(filters.sedeId));
        const grupoInfo = gruposDisponibles?.find(g => String(g.id) === String(filters.grupoId));

        const nombreSede = sedeInfo ? (sedeInfo.label || sedeInfo.nombre) : 'No especificada';
        const nombreGrupo = grupoInfo ? (grupoInfo.label || grupoInfo.nombre) : 'No especificado';

        const fechaReporte = new Date().toLocaleString('es-CO', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        // 2. Construir el bloque superior de información
        // Usamos comillas dobles y separadores para que Excel lo acomode bien en las celdas
        const infoSuperior = [
            ["REPORTE DE AUDITORÍA: CALIFICACIONES FALTANTES"],
            [`Sede:;"${nombreSede}"`],
            [`Grado y Grupo:;"${nombreGrupo}"`],
            [`Fecha del reporte:;"${fechaReporte}"`],
            [""] // Fila completamente vacía para separar el encabezado de la tabla
        ];

        // 3. Encabezados de la tabla
        const encabezados = ["Docente", "Asignatura", "Periodos Pendientes", "Estudiante"];

        // 4. Construir las filas de datos
        const filas = reporteFaltantes.map(item => [
            `"${item.docente}"`,
            `"${item.asignatura}"`,
            `"${item.periodos}"`,
            `"${item.estudiante}"`
        ]);

        // 5. Unir todo: El encabezado superior, luego las columnas, luego los datos
        const contenidoCSV = [
            ...infoSuperior.map(fila => fila.join(";")),
            encabezados.join(";"),
            ...filas.map(fila => fila.join(";"))
        ].join("\n");

        // 6. Crear el archivo virtual con BOM (\uFEFF) para que soporte tildes y Ñ
        const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // 7. Generar descarga dinámica con el nombre del grupo
        const link = document.createElement("a");
        link.href = url;
        const nombreArchivoSeguro = nombreGrupo.replace(/[^a-zA-Z0-9]/g, '_'); // Quita espacios y caracteres raros
        link.setAttribute("download", `Faltantes_${nombreArchivoSeguro}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loadingCatalogs) return <div className="p-10 text-center text-gray-500">Cargando módulos...</div>;

    return (
        <div className="container mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Recuperaciones y Nivelaciones</h1>

            {/* SECCIÓN DE FILTROS */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

                    {/* 1. Sede */}
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

                    {/* 2. Grupo */}
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

                    {/* 3. Asignatura */}
                    <div className="md:col-span-4">
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

                    {/* 4. Botones (Limpiar y Generar) */}
                    <div className="md:col-span-2 flex justify-end gap-2">
                        <button
                            onClick={clearFilters}
                            title="Limpiar filtros"
                            className="w-full md:w-auto h-[42px] px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg border border-gray-300 transition-colors flex items-center justify-center"
                        >
                            <FontAwesomeIcon icon={faEraser} />
                        </button>

                        {/* Botón exclusivo para ADMIN/COORDINADOR */}
                        {esAdmin && (
                            <button
                                onClick={handleGenerarConsolidados}
                                disabled={isGenerating || !filters.grupoId}
                                title="Generar Consolidados Anuales"
                                className="w-full md:w-auto h-[40px] px-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <FontAwesomeIcon icon={isGenerating ? faCogs : faExclamationTriangle} className={isGenerating ? "animate-spin" : ""} />
                                <span className="hidden lg:inline">Cerrar Año</span>
                            </button>
                        )}
                    </div>

                </div>
            </div>

            {/* SECCIÓN DE LA GRILLA */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loadingGrilla ? (
                    <div className="text-center p-10 text-gray-500 animate-pulse">Cargando lista de reprobados...</div>
                ) : studentsData.length > 0 ? (
                    <GrillaNivelaciones
                        students={studentsData}
                        onSaveSuccess={loadGrilla} // Al guardar con éxito, recargamos las notas
                    />
                ) : filters.asignaturaId ? (
                    <div className="text-center p-10 text-gray-500 flex flex-col items-center justify-center gap-2">
                        <span className="text-4xl">🎉</span>
                        <p>No hay estudiantes reprobados en esta Área.</p>
                        {/* <p className="text-xs text-gray-400">Si el año no ha finalizado, pídale al administrador que genere los consolidados.</p> */}
                    </div>
                ) : (
                    <div className="text-center p-10 text-gray-400 italic">
                        Seleccione una Sede, Grupo y Área para comenzar.
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* MODAL DE AUDITORÍA (CHECK DE VUELO - NOTAS FALTANTES)     */}
            {/* ========================================================= */}
            {reporteFaltantes && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden border-t-4 border-orange-500">
                        <div className="p-5 border-b border-gray-100 bg-orange-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-orange-500" />
                                Advertencia: Calificaciones Faltantes
                            </h3>
                            <button onClick={() => setReporteFaltantes(null)} className="text-gray-400 hover:text-gray-600">
                                <FontAwesomeIcon icon="times" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-sm text-gray-700 mb-4">
                                El sistema ha detectado <strong>{reporteFaltantes.length}</strong> calificaciones en blanco para este grupo.
                                Si fuerza el cierre de año, estos espacios vacíos se promediarán matemáticamente como 0.0, lo que podría reprobar estudiantes injustamente.
                            </p>

                            {/* Tabla de Reporte */}
                            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Docente</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Asignatura</th>
                                            <th className="px-4 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Periodos Pendientes</th>
                                            <th className="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Estudiante</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 text-sm">
                                        {reporteFaltantes.map((item, index) => (
                                            <tr key={index} className="hover:bg-orange-50/50 transition-colors">
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-800 font-medium">{item.docente}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-600">{item.asignatura}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-center font-bold text-orange-600">{item.periodos}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-gray-600">{item.estudiante}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="p-4 bg-gray-50 border-t flex justify-between items-center gap-3">
                            <span className="text-xs text-gray-500 italic">Se recomienda contactar a los docentes antes de proceder.</span>
                            <div className="flex flex-wrap justify-end gap-3">
                                {/* Botón para descargar reporte */}
                                <button
                                    onClick={descargarReporteExcel}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm shadow-md font-bold transition-colors flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faDownload} />
                                    Descargar Excel
                                </button>

                                <button
                                    onClick={() => setReporteFaltantes(null)}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm shadow-md font-bold transition-colors flex items-center gap-2"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleGenerarConsolidados(true)} // true = forzar cierre
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors font-semibold"
                                >
                                    <FontAwesomeIcon icon={faExclamationTriangle} />
                                    Forzar Cierre de Año
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NivelacionesPage;