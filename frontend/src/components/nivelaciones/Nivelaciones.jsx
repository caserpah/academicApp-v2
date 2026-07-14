import React, { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faClipboardList, faSearch, faEraser, faEye, faUpload, faTimes, faFilePdf, faArchive,
    faExclamationTriangle, faSchool, faFilter, faChevronUp, faChevronDown, faSpinner
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext.jsx";

import NivelacionForm from "./NivelacionForm.jsx";
import {
    fetchPendientesNivelacion,
    fetchNivelacionCatalogs,
    fetchReprobadosDirectos,
    descargarActaNivelacionPdf
} from "../../api/nivelacionesService.js";
import { showSuccess, showError, showWarning } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import { formatearNombreGrupo } from "../../utils/formatters.js";
import swal from "sweetalert2";

const Nivelaciones = () => {
    // --- AUTH CONTEXT ---
    const { user } = useAuth();
    const rolUsuario = user?.role || 'docente';

    // --- PERMISOS DE USUARIO ---
    // esAdmin será true si el rol es admin, coordinador o secretaria.
    const esAdmin = ['admin', 'coordinador', 'secretaria'].includes(rolUsuario);

    // --- ESTADOS DE CONFIGURACIÓN Y CATÁLOGOS ---
    const [vigenciaActual, setVigenciaActual] = useState(null); // Guardamos la actual para comparar
    const [vigencias, setVigencias] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [gruposDisponibles, setGruposDisponibles] = useState([]);

    // Filtros Seleccionados
    const [filters, setFilters] = useState({
        sedeId: '',
        grupoId: '',
        vigenciaId: ''
    });

    // Estados de Datos y UI
    const [areasNivelacion, setAreasNivelacion] = useState([]);
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [loadingTabla, setLoadingTabla] = useState(false);
    const [descargandoActaId, setDescargandoActaId] = useState(null);

    // Control de Modales
    const [mode, setMode] = useState("lista");
    const [selectedEstudiante, setSelectedEstudiante] = useState(null);
    const [selectedAreaId, setSelectedAreaId] = useState(null);
    const [detalleAsignaturasView, setDetalleAsignaturasView] = useState(null);

    // Estado para almacenar los estudiantes reprobados directamente (si es necesario)
    const [reprobadosDirectos, setReprobadosDirectos] = useState([]);

    // Control de colapsado por área (opcional, para mejorar UX si hay muchas áreas)
    const [collapsedAreas, setCollapsedAreas] = useState({});

    const toggleArea = (areaId) => {
        setCollapsedAreas(prev => ({
            ...prev,
            [areaId]: !prev[areaId]
        }));
    };

    // --- CARGA INICIAL ---
    useEffect(() => {
        const loadInit = async () => {
            try {
                setLoadingCatalogs(true);
                const data = await fetchNivelacionCatalogs(rolUsuario);

                setVigencias(data.vigencias || []);
                setVigenciaActual(data.vigenciaActual || data.vigencia);
                setSedes(data.sedes);
                setGrupos(data.grupos);

                setFilters(prev => ({
                    ...prev,
                    sedeId: data.sedes.length === 1 ? data.sedes[0].id : '',
                    vigenciaId: (data.vigenciaActual?.id || data.vigencia?.id) || ''
                }));
            } catch (err) {
                showError("No se pudieron cargar los filtros iniciales.");
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
            setFilters(prev => ({ ...prev, grupoId: '' }));
        }
    }, [filters.sedeId, grupos, filters.grupoId]);

    // --- ACCIÓN DE BÚSQUEDA ---
    const handleBuscar = useCallback(async () => {
        const { grupoId, vigenciaId } = filters;
        if (!grupoId) return;

        try {
            setLoadingTabla(true);
            const dataNivelaciones = await fetchPendientesNivelacion(grupoId, vigenciaId);
            setAreasNivelacion(dataNivelaciones);

            if (esAdmin) {
                const dataReprobados = await fetchReprobadosDirectos(grupoId, vigenciaId);
                setReprobadosDirectos(dataReprobados);
            }

            if (dataNivelaciones.length === 0) {
                showWarning("No existen estudiantes pendientes de nivelación para este grupo en el año lectivo seleccionado.", "Aviso");
            }
        } catch (err) {
            showError(err.message);
        } finally {
            setLoadingTabla(false);
        }
    }, [filters, esAdmin]);

    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setAreasNivelacion([]);
        setReprobadosDirectos([]);
    };

    const clearFilters = () => {
        setFilters({
            sedeId: sedes.length === 1 ? sedes[0].id : '',
            grupoId: '',
            vigenciaId: vigenciaActual?.id || ''
        });
        setAreasNivelacion([]);
        setReprobadosDirectos([]);
    };

    // --- DESCARGA DE ACTA PDF ---
    const handleDescargarActa = async (e, areaId, nombreArea) => {
        e.stopPropagation(); // Evita que el contenedor del acordeón cambie su estado colapsado
        const { grupoId, vigenciaId } = filters;
        if (!grupoId || !areaId) return;

        try {
            setDescargandoActaId(areaId);
            const blobData = await descargarActaNivelacionPdf(grupoId, areaId, vigenciaId);

            // Creación del objectURL local para forzar el flujo de descarga en el cliente navegador
            const blob = new Blob([blobData], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.setAttribute("download", `Acta_Nivelacion_${nombreArea.replace(/\s+/g, "_")}.pdf`);
            document.body.appendChild(link);

            link.click();

            // Limpieza y liberación de memoria activa
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);

            swal.fire({
                title: "Descarga completada",
                text: `El acta de nivelación para el área "${nombreArea}" ha sido descargada exitosamente.`,
                icon: "success",
                timer: 3000, // <-- Se cierra solo después de 3 segundos
                showConfirmButton: false,
                trueprogressBar: true,
            });
        } catch (err) {
            showError(err.message || "No se pudo completar la exportación del documento PDF.");
        } finally {
            setDescargandoActaId(null);
        }
    };

    // Variable auxiliar: Será true si el filtro seleccionado pertenece a un año diferente al actual
    const esVigenciaHistorica = filters.vigenciaId && String(filters.vigenciaId) !== String(vigenciaActual?.id);

    if (loadingCatalogs) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-full mx-auto space-y-6">

                {/* Encabezado */}
                <div className="flex justify-between items-center pb-4">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faClipboardList} className="text-blue-600 mr-3" />
                        Reporte de Nivelaciones
                    </h1>
                    {vigenciaActual && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                            Año Lectivo: {vigenciaActual.anio} {esAdmin && '(Administrador)'}
                        </span>
                    )}
                </div>

                {/* Filtros Limpios (Sin Área) */}
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        {esAdmin && (
                            <div className="md:col-span-3">
                                <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Año Lectivo</label>
                                <select
                                    name="vigenciaId"
                                    value={filters.vigenciaId}
                                    onChange={handleFilterChange}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {vigencias.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.anio} {v.actual ? '(Actual)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* SEDE: Ajusta su ancho si el admin está viendo el año lectivo */}
                        <div className={esAdmin ? "md:col-span-3" : "md:col-span-4"}>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Sede <span className="text-red-500">*</span></label>
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

                        {/* GRUPO: Ajusta su ancho si el admin está viendo el año lectivo */}
                        <div className={esAdmin ? "md:col-span-3" : "md:col-span-5"}>
                            <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Grupo <span className="text-red-500">*</span></label>
                            <select
                                name="grupoId"
                                value={filters.grupoId}
                                onChange={handleFilterChange}
                                disabled={!filters.sedeId}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                            >
                                <option value="">-- Seleccione Grupo --</option>
                                {gruposDisponibles.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {formatearNombreGrupo(g.label)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* BOTONES DE BÚSQUEDA */}
                        <div className="md:col-span-3 flex gap-2">
                            <button
                                onClick={handleBuscar}
                                disabled={!filters.grupoId || loadingTabla}
                                className="flex-1 h-[42px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {loadingTabla ? <LoadingSpinner size="small" color="white" /> : <FontAwesomeIcon icon={faSearch} />}
                                Buscar
                            </button>
                            <button
                                onClick={clearFilters}
                                title="Limpiar filtros"
                                className="h-[42px] px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg border border-gray-300 transition-colors flex items-center justify-center"
                            >
                                <FontAwesomeIcon icon={faEraser} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tablas Múltiples (Una por cada Área a nivelar) */}
                <div className="space-y-6">
                    {!filters.grupoId ? (
                        <div className="rounded-xl shadow-md border border-gray-200 flex flex-col items-center justify-center h-80 text-gray-400 bg-gray-50">
                            <FontAwesomeIcon icon={faFilter} className="text-5xl mb-4 opacity-20" />
                            <p className="font-medium">Seleccione la sede y el grupo para consultar los pendientes.</p>
                        </div>
                    ) : areasNivelacion.length === 0 && !loadingTabla ? (
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center text-gray-400 italic">
                            No existen estudiantes pendientes de nivelación en este grupo.
                        </div>
                    ) : (
                        areasNivelacion.map((area) => (
                            <div key={area.areaId} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">

                                {/* Header del Área */}
                                <div
                                    onClick={() => toggleArea(area.areaId)}
                                    className="bg-slate-700 px-5 py-3 border-b border-gray-200 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors select-none"
                                >
                                    <div className="flex items-center gap-3">
                                        <FontAwesomeIcon
                                            icon={collapsedAreas[area.areaId] ? faChevronDown : faChevronUp}
                                            className="text-gray-400 text-sm"
                                        />
                                        <h3 className="font-bold text-white text-sm uppercase tracking-wide">
                                            ÁREA: {area.nombreArea}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Botón de Descarga de Acta PDF Oficial */}
                                        <button
                                            onClick={(e) => handleDescargarActa(e, area.areaId, area.nombreArea)}
                                            disabled={descargandoActaId === area.areaId}
                                            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 transition shadow-sm disabled:opacity-60"
                                            title="Descargar Acta de Nivelación Oficial en formato PDF"
                                        >
                                            <FontAwesomeIcon
                                                icon={descargandoActaId === area.areaId ? faSpinner : faFilePdf}
                                                spin={descargandoActaId === area.areaId}
                                            />
                                            {descargandoActaId === area.areaId ? "Generando..." : "Generar Acta en PDF"}
                                        </button>

                                        <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1.5 rounded-md shadow-sm disabled:cursor-not-allowed">
                                            {area.estudiantes.length} Pendientes
                                        </span>
                                    </div>
                                </div>

                                {/* Tabla Interna */}
                                {!collapsedAreas[area.areaId] && (
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase">Estudiante</th>
                                                    <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 uppercase">Definitiva Área</th>
                                                    <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 uppercase">Causa (Asignaturas)</th>
                                                    <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {area.estudiantes.map((est) => (
                                                    <tr key={est.nivelacionId} className="hover:bg-blue-50/60 transition">
                                                        <td className="px-5 py-3">
                                                            <div className="text-sm font-bold text-gray-800">{est.nombreEstudiante}</div>
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-md border border-red-200 bg-red-50 text-red-700 font-bold text-sm">
                                                                {Number(est.notaOriginalArea).toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            {est.detalleAsignaturas?.length > 0 ? (
                                                                <button
                                                                    onClick={() => setDetalleAsignaturasView(est.detalleAsignaturas)}
                                                                    className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-md hover:bg-blue-100 transition"
                                                                >
                                                                    <FontAwesomeIcon icon={faEye} className="mr-1" /> Ver Detalle
                                                                </button>
                                                            ) : (
                                                                <span className="text-xs text-gray-400 italic">Sin registros</span>
                                                            )}
                                                        </td>

                                                        <td className="px-5 py-3 text-right">
                                                            {est.pierdeAnio ? (
                                                                <span
                                                                    className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 font-bold text-xs px-3 py-2 rounded-lg shadow-sm cursor-help"
                                                                    title="No es posible nivelar: Reprueba el año lectivo por perder 3 o más áreas."
                                                                >
                                                                    <FontAwesomeIcon icon={faTimes} /> Reprobó
                                                                </span>
                                                            ) : est.estadoFinal !== "PENDIENTE" ? (
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <span className={`text-xs font-bold px-3 py-1.5 cursor-help rounded-md shadow-sm border ${est.estadoFinal === 'NIVELADO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`} title="Calificación alcanzada por el estudiante.">
                                                                        {est.estadoFinal === 'NIVELADO' ? 'Nivelado: ' : 'No Nivelado: '}
                                                                        {Number(est.notaNivelacion).toFixed(2)}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedEstudiante(est);
                                                                            setSelectedAreaId(area.areaId);
                                                                            setMode("registrar");
                                                                        }}
                                                                        className="text-[11px] font-semibold text-gray-500 hover:text-blue-600 transition underline flex items-center gap-1"
                                                                    >
                                                                        {/* Ajuste: Texto dinámico según el rol */}
                                                                        <FontAwesomeIcon icon={faEye} /> {esAdmin ? 'Ver / Editar' : 'Ver Detalles'}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                // --- VISTA PARA ESTUDIANTES PENDIENTES ---
                                                                esAdmin ? (
                                                                    !esVigenciaHistorica ? (
                                                                        <button
                                                                            onClick={() => {
                                                                                setSelectedEstudiante(est);
                                                                                setSelectedAreaId(area.areaId);
                                                                                setMode("registrar");
                                                                            }}
                                                                            className="text-sm font-bold text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition shadow-sm inline-flex items-center"
                                                                        >
                                                                            <FontAwesomeIcon icon={faUpload} className="mr-2" /> Evaluar
                                                                        </button>
                                                                    ) : (
                                                                        <span
                                                                            className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 border border-gray-200 font-bold text-[11px] px-3 py-1.5 rounded-md shadow-sm cursor-help"
                                                                            title="Año lectivo cerrado. Solo lectura."
                                                                        >
                                                                            <FontAwesomeIcon icon={faArchive} /> Histórico
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    <span
                                                                        className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[11px] px-3 py-1.5 rounded-md shadow-sm cursor-help"
                                                                        title="La nivelación está pendiente de ser registrada por secretaría."
                                                                    >
                                                                        Pendiente
                                                                    </span>
                                                                )
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* SECCIÓN EXCLUSIVA ADMINISTRADOR: REPROBADOS DIRECTOS */}
                {esAdmin && filters.grupoId && reprobadosDirectos.length > 0 && (
                    <div className="mt-8 bg-red-50 rounded-xl shadow-md border-2 border-red-200 overflow-hidden">
                        <div className="bg-red-700 px-5 py-3 flex justify-between items-center">
                            <h3 className="font-bold text-white text-sm uppercase tracking-wide flex items-center gap-2">
                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                ESTUDIANTES QUE REPRUEBAN EL AÑO LECTIVO (3 o más áreas)
                            </h3>
                            <span className="bg-white text-red-800 text-xs font-extrabold px-2 py-1 rounded-md shadow-sm">
                                {reprobadosDirectos.length} Reprobados
                            </span>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {reprobadosDirectos.map(est => (
                                <div key={est.matriculaId} className="bg-white border border-red-100 p-4 rounded-lg shadow-sm">
                                    <p className="font-bold text-gray-800 text-sm mb-2 pb-2 border-b border-gray-100">{est.nombreEstudiante}</p>
                                    <p className="text-xs text-gray-500 mb-1 font-semibold">Áreas que causan la pérdida:</p>
                                    <ul className="space-y-1">
                                        {est.areasPerdidas.map((area, idx) => (
                                            <li key={idx} className="text-xs flex justify-between items-center bg-red-50/50 p-1.5 rounded">
                                                <span className="text-gray-700">{area.nombre}</span>
                                                <span className="font-bold text-red-600">{Number(area.nota).toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modal de Registro de Nota */}
                {mode === 'registrar' && selectedEstudiante && (
                    <NivelacionForm
                        registroOriginal={selectedEstudiante}
                        areaId={selectedAreaId}
                        soloLectura={!esAdmin}
                        onSuccess={async () => {
                            await showSuccess("Calificación de nivelación registrada de forma exitosa.");
                            setMode("lista"); // Una vez cerrada la alerta, cerramos el modal y recargamos la tabla oculta
                            handleBuscar(); // Recarga las tablas
                        }}
                        onCancel={() => setMode("lista")}
                    />
                )}

                {/* Modal de Detalle JSON (Se mantiene idéntico) */}
                {detalleAsignaturasView && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border-t-4 border-blue-600 animate-fade-in">
                            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-800">Causa de Pérdida por Asignatura</h3>
                                <button onClick={() => setDetalleAsignaturasView(null)} className="text-gray-400 hover:text-red-500 transition">
                                    <FontAwesomeIcon icon={faTimes} size="lg" />
                                </button>
                            </div>
                            <div className="p-4 max-h-96 overflow-y-auto">
                                <ul className="space-y-3">
                                    {detalleAsignaturasView.map((asig, idx) => (
                                        <li key={idx} className={`p-3 rounded-md border ${asig.responsablePerdida ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="flex justify-between items-center">
                                                <span className="font-semibold text-gray-800 text-sm">{asig.nombre} <span className="text-xs font-normal text-gray-400">({asig.porcentaje}%)</span></span>
                                                <span className={`font-bold text-sm ${asig.responsablePerdida ? 'text-red-600' : 'text-gray-600'}`}>
                                                    Nota: {Number(asig.notaFinal).toFixed(2)}
                                                </span>
                                            </div>
                                            {asig.responsablePerdida && (
                                                <p className="text-[11px] text-red-500 mt-1 flex items-center"><FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" /> Asignatura perdida</p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-4 border-t border-gray-200 bg-gray-50 text-right">
                                <button onClick={() => setDetalleAsignaturasView(null)} className="bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition text-sm font-medium">Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default Nivelaciones;