import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faFileContract,
    faUserGraduate,
    faDownload,
    faSpinner,
    faUsers,
    faFileAlt,
    faTimes,
    faLayerGroup,
    faExclamationTriangle,
    faCheckCircle
} from "@fortawesome/free-solid-svg-icons";

import {
    buscarEstudianteConMatriculas,
    descargarCertificadoMatricula,
    descargarCertificadoNotas,
    descargarCertificadosMatriculaMasivo,
    descargarCertificadosNotasMasivo
} from "../../api/certificadosService.js";
import { fetchVigencias } from "../../api/vigenciasService.js";
import { fetchInitialData as fetchSedesData } from "../../api/sedesService.js";
import { fetchGruposPorSede } from "../../api/gruposService.js";
import { showError, showWarning } from "../../utils/notifications.js";
import Swal from "sweetalert2";

/**
 * Determina las opciones de periodos disponibles según el grado o ciclo
 */
const obtenerOpcionesPeriodoPorGrado = (gradoNombre) => {
    if (!gradoNombre) return [];
    const grado = gradoNombre.toUpperCase();

    if (grado.includes('CICLO_VI') || grado.includes('CICLO VI')) {
        return [
            { value: "3", label: "Tercer Periodo" },
            { value: "4", label: "Cuarto Periodo" },
            { value: "5", label: "Informe Final (Definitivas)", isFinal: true }
        ];
    }
    if (grado.includes('CICLO_V') || grado.includes('CICLO V')) {
        return [
            { value: "1", label: "Primer Periodo" },
            { value: "2", label: "Segundo Periodo" },
            { value: "3", label: "Informe Final (Definitivas)", isFinal: true }
        ];
    }
    return [
        { value: "1", label: "Primer Periodo" },
        { value: "2", label: "Segundo Periodo" },
        { value: "3", label: "Tercer Periodo" },
        { value: "4", label: "Cuarto Periodo" },
        { value: "5", label: "Informe Final (Definitivas)", isFinal: true }
    ];
};

const CertificadosPage = () => {
    // Modo de operación: "INDIVIDUAL" | "MASIVO"
    const [modoEmision, setModoEmision] = useState("INDIVIDUAL");

    // Catálogos compartidos (Vigencias y Sedes)
    const [vigencias, setVigencias] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [loadingCatalogos, setLoadingCatalogos] = useState(false);

    // ==========================================================
    // ESTADOS: MODO INDIVIDUAL
    // ==========================================================
    const [busqueda, setBusqueda] = useState("");
    const [filtroAnioBusqueda, setFiltroAnioBusqueda] = useState("");
    const [resultados, setResultados] = useState([]);
    const [estudiante, setEstudiante] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [vigenciaSeleccionada, setVigenciaSeleccionada] = useState("");

    // ==========================================================
    // ESTADOS: MODO MASIVO POR GRUPO
    // ==========================================================
    const [masivoVigenciaId, setMasivoVigenciaId] = useState("");
    const [masivoSedeId, setMasivoSedeId] = useState("");
    const [gruposDisponibles, setGruposDisponibles] = useState([]);
    const [loadingGrupos, setLoadingGrupos] = useState(false);
    const [masivoGrupoId, setMasivoGrupoId] = useState("");
    const [reporteLote, setReporteLote] = useState(null); // { totalGenerados, omitidos, esErrorTotal }

    // ==========================================================
    // ESTADOS: CONFIGURACIÓN DEL DOCUMENTO (COMPARTIDA)
    // ==========================================================
    const [tipoDocumento, setTipoDocumento] = useState("MATRICULA");
    const [isGenerating, setIsGenerating] = useState(false);
    const [config, setConfig] = useState({
        matriculaId: "",
        iniciaronClases: true,
        meses: "",
        comportamiento: "",
        periodo: ""
    });

    // Cargar vigencias y sedes al montar el componente
    useEffect(() => {
        const cargarCatalogos = async () => {
            try {
                setLoadingCatalogos(true);
                const [listaVigencias, sedesResp] = await Promise.all([
                    fetchVigencias(),
                    fetchSedesData()
                ]);

                const vigenciasOrdenadas = [...(listaVigencias || [])].sort((a, b) => b.anio - a.anio);
                setVigencias(vigenciasOrdenadas);

                const listaSedes = sedesResp?.sedes || [];
                setSedes(listaSedes);

                // Preseleccionar vigencia activa y sede única en modo masivo si existen
                const activa = vigenciasOrdenadas.find(v => v.activa) || vigenciasOrdenadas[0];
                if (activa) {
                    setMasivoVigenciaId(String(activa.id));
                }
                if (listaSedes.length === 1) {
                    setMasivoSedeId(String(listaSedes[0].id));
                }
            } catch (error) {
                console.error("Error al cargar catálogos de certificados:", error);
            } finally {
                setLoadingCatalogos(false);
            }
        };

        cargarCatalogos();
    }, []);

    // Cargar grupos en cascada cuando cambia vigencia o sede en modo masivo
    useEffect(() => {
        if (!masivoVigenciaId || !masivoSedeId) {
            setGruposDisponibles([]);
            setMasivoGrupoId("");
            return;
        }

        let cancelado = false;
        const cargarGrupos = async () => {
            try {
                setLoadingGrupos(true);
                setMasivoGrupoId("");
                setReporteLote(null);
                setConfig(prev => ({ ...prev, periodo: "" }));

                const items = await fetchGruposPorSede(masivoSedeId, masivoVigenciaId);
                if (!cancelado) {
                    const ordenados = [...(items || [])].sort((a, b) => {
                        const ordenA = a.grado?.orden ?? 999;
                        const ordenB = b.grado?.orden ?? 999;
                        if (ordenA !== ordenB) return ordenA - ordenB;
                        return String(a.nombre || "").localeCompare(String(b.nombre || ""));
                    });
                    setGruposDisponibles(ordenados);
                }
            } catch (error) {
                if (!cancelado) {
                    showError(error.message || "Error al cargar los grupos de la sede.");
                    setGruposDisponibles([]);
                }
            } finally {
                if (!cancelado) setLoadingGrupos(false);
            }
        };

        cargarGrupos();
        return () => { cancelado = true; };
    }, [masivoVigenciaId, masivoSedeId]);

    // ==========================================================
    // LÓGICA DERIVADA: MODO INDIVIDUAL
    // ==========================================================
    const vigenciasDisponiblesEstudiante = useMemo(() => {
        if (!estudiante?.matriculas) return [];
        return [...new Set(estudiante.matriculas.map(m => m.anio).filter(Boolean))].sort((a, b) => b - a);
    }, [estudiante]);

    const matriculasDelAnio = useMemo(() => {
        if (!estudiante?.matriculas) return [];
        return estudiante.matriculas.filter(m => m.anio === Number(vigenciaSeleccionada));
    }, [estudiante, vigenciaSeleccionada]);

    const getOpcionesPeriodoIndividual = () => {
        const mat = estudiante?.matriculas?.find(m => String(m.id) === String(config.matriculaId));
        return obtenerOpcionesPeriodoPorGrado(mat?.grado);
    };

    const seleccionarEstudiante = (est, anioPreferido = "") => {
        setEstudiante(est);
        const matriculas = est.matriculas || [];
        if (matriculas.length === 0) {
            setVigenciaSeleccionada("");
            setConfig(prev => ({ ...prev, matriculaId: "", periodo: "" }));
            showWarning("El estudiante seleccionado no tiene matrículas registradas.");
            return;
        }

        const aniosOrdenados = [...new Set(matriculas.map(m => m.anio).filter(Boolean))].sort((a, b) => b - a);
        const anioObjetivo = anioPreferido && aniosOrdenados.includes(Number(anioPreferido))
            ? Number(anioPreferido)
            : aniosOrdenados[0];

        const matriculasAnio = matriculas.filter(m => m.anio === anioObjetivo);
        const matriculaInicial = matriculasAnio[0] || matriculas[0];

        setVigenciaSeleccionada(String(anioObjetivo || ""));
        setConfig(prev => ({
            ...prev,
            matriculaId: matriculaInicial ? String(matriculaInicial.id) : "",
            periodo: ""
        }));
    };

    const handleBuscar = async (e) => {
        e.preventDefault();
        if (!busqueda.trim()) return;

        try {
            setIsSearching(true);
            setEstudiante(null);
            setResultados([]);
            setVigenciaSeleccionada("");
            setConfig(prev => ({ ...prev, matriculaId: "", periodo: "" }));

            const data = await buscarEstudianteConMatriculas(busqueda);
            const listaFiltrada = filtroAnioBusqueda
                ? (data || []).filter(est => est.matriculas?.some(m => Number(m.anio) === Number(filtroAnioBusqueda)))
                : (data || []);

            if (listaFiltrada.length > 0) {
                setResultados(listaFiltrada);
                if (listaFiltrada.length === 1) {
                    seleccionarEstudiante(listaFiltrada[0], filtroAnioBusqueda);
                }
            } else {
                showWarning(
                    filtroAnioBusqueda
                        ? `No se encontraron estudiantes para "${busqueda}" en el año ${filtroAnioBusqueda}.`
                        : "No se encontraron registros."
                );
            }
        } catch (error) {
            showWarning(error.message || "No se encontró ningún estudiante.");
        } finally {
            setIsSearching(false);
        }
    };

    const limpiarBusqueda = () => {
        setBusqueda("");
        setResultados([]);
        setEstudiante(null);
        setVigenciaSeleccionada("");
        setConfig(prev => ({ ...prev, matriculaId: "", periodo: "" }));
    };

    const volverALaLista = () => {
        setEstudiante(null);
        setVigenciaSeleccionada("");
        setConfig(prev => ({ ...prev, matriculaId: "", periodo: "" }));
    };

    // ==========================================================
    // LÓGICA DERIVADA: MODO MASIVO
    // ==========================================================
    const grupoSeleccionadoObj = useMemo(() => {
        return gruposDisponibles.find(g => String(g.id) === String(masivoGrupoId)) || null;
    }, [gruposDisponibles, masivoGrupoId]);

    const getOpcionesPeriodoMasivo = () => {
        return obtenerOpcionesPeriodoPorGrado(grupoSeleccionadoObj?.grado?.nombre);
    };

    // ==========================================================
    // DISPARADOR DE GENERACIÓN (INDIVIDUAL Y MASIVO)
    // ==========================================================
    const handleGenerar = async () => {
        if (modoEmision === "INDIVIDUAL") {
            if (!config.matriculaId) {
                showWarning("Debe seleccionar un año y grado de matrícula.");
                return;
            }
            if (tipoDocumento === "NOTAS" && !config.periodo) {
                showWarning("Seleccione el periodo a certificar.");
                return;
            }

            try {
                setIsGenerating(true);

                if (tipoDocumento === "MATRICULA") {
                    await descargarCertificadoMatricula({
                        matriculaId: config.matriculaId,
                        iniciaronClases: config.iniciaronClases,
                        meses: config.iniciaronClases ? config.meses : "",
                        comportamiento: config.iniciaronClases ? config.comportamiento : ""
                    });
                } else {
                    await descargarCertificadoNotas({
                        matriculaId: config.matriculaId,
                        periodo: config.periodo
                    });
                }

                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: 'Certificado generado exitosamente.',
                    timer: 2500,
                    showConfirmButton: false
                });
            } catch (error) {
                if (error.message?.includes("no tiene calificaciones") || error.status === 404) {
                    showWarning(error.message);
                } else {
                    showError(error.message || "Error al generar el documento.");
                }
            } finally {
                setIsGenerating(false);
            }
            return;
        }

        // MODO MASIVO
        if (!masivoVigenciaId || !masivoSedeId || !masivoGrupoId) {
            showWarning("Seleccione vigencia, sede y grupo para generar el lote.");
            return;
        }
        if (tipoDocumento === "NOTAS" && !config.periodo) {
            showWarning("Seleccione el periodo a certificar para el grupo.");
            return;
        }

        try {
            setIsGenerating(true);
            setReporteLote(null);

            let resultado;
            if (tipoDocumento === "MATRICULA") {
                resultado = await descargarCertificadosMatriculaMasivo({
                    grupoId: masivoGrupoId,
                    vigenciaId: masivoVigenciaId,
                    iniciaronClases: config.iniciaronClases,
                    meses: config.iniciaronClases ? config.meses : "",
                    comportamiento: config.iniciaronClases ? config.comportamiento : ""
                });
            } else {
                resultado = await descargarCertificadosNotasMasivo({
                    grupoId: masivoGrupoId,
                    vigenciaId: masivoVigenciaId,
                    periodo: config.periodo
                });
            }

            const totalGen = resultado?.totalGenerados || 0;
            const omitidos = resultado?.omitidos || [];

            setReporteLote({
                totalGenerados: totalGen,
                omitidos,
                esErrorTotal: false
            });

            if (omitidos.length === 0) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Lote Generado!',
                    text: `Se descargaron ${totalGen} certificados correctamente sin novedades.`,
                    timer: 3000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: 'info',
                    title: 'Lote Generado con Novedades',
                    text: `Se generaron ${totalGen} certificados y se omitieron ${omitidos.length} estudiante(s). Revise el detalle en pantalla.`,
                    confirmButtonColor: '#1e40af'
                });
            }
        } catch (error) {
            if (Array.isArray(error.omitidos) && error.omitidos.length > 0) {
                setReporteLote({
                    totalGenerados: 0,
                    omitidos: error.omitidos,
                    esErrorTotal: true
                });
                showWarning(error.message);
            } else if (error.status === 404) {
                showWarning(error.message);
            } else {
                showError(error.message || "Error al generar los certificados en lote.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const cambiarModo = (nuevoModo) => {
        setModoEmision(nuevoModo);
        setReporteLote(null);
        setConfig(prev => ({ ...prev, periodo: "" }));
    };

    const botonDeshabilitado = isGenerating || (
        modoEmision === "INDIVIDUAL"
            ? (!config.matriculaId || (tipoDocumento === "NOTAS" && !config.periodo))
            : (!masivoGrupoId || (tipoDocumento === "NOTAS" && !config.periodo))
    );

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="pb-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center text-slate-800">
                            <FontAwesomeIcon icon={faFileContract} className="text-blue-600 mr-3" />
                            Emisión de Certificados
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Genere constancias de matrícula y certificados de estudio individuales o por grupo.
                        </p>
                    </div>
                </div>

                {/* Selector de Modo (Individual vs Masivo) */}
                <div className="bg-white p-1.5 rounded-xl shadow-sm border border-gray-200 grid grid-cols-2 gap-1.5">
                    <button
                        type="button"
                        onClick={() => cambiarModo("INDIVIDUAL")}
                        className={`py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${modoEmision === "INDIVIDUAL"
                            ? "bg-blue-800 text-white shadow-sm"
                            : "text-slate-600 hover:bg-gray-100"
                            }`}
                    >
                        <FontAwesomeIcon icon={faUserGraduate} />
                        Emisión Individual
                    </button>
                    <button
                        type="button"
                        onClick={() => cambiarModo("MASIVO")}
                        className={`py-2.5 px-4 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${modoEmision === "MASIVO"
                            ? "bg-blue-800 text-white shadow-sm"
                            : "text-slate-600 hover:bg-gray-100"
                            }`}
                    >
                        <FontAwesomeIcon icon={faLayerGroup} />
                        Emisión Masiva por Grupo
                    </button>
                </div>

                {/* ========================================================== */}
                {/* BLOQUE 1: EMISIÓN INDIVIDUAL                               */}
                {/* ========================================================== */}
                {modoEmision === "INDIVIDUAL" && (
                    <>
                        {/* Buscador con filtro opcional de vigencia */}
                        <form onSubmit={handleBuscar} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                <div className="md:col-span-8">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">
                                        Buscar por documento, nombres o apellidos
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={busqueda}
                                            onChange={(e) => setBusqueda(e.target.value)}
                                            placeholder="Ej: 1067... o Carlos"
                                            className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 pr-9 text-sm outline-none focus:border-blue-500 transition-colors"
                                        />
                                        <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-3.5 text-gray-400" />
                                        {busqueda && (
                                            <button
                                                type="button"
                                                onClick={limpiarBusqueda}
                                                title="Limpiar búsqueda"
                                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                            >
                                                <FontAwesomeIcon icon={faTimes} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="md:col-span-4">
                                    <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">
                                        Filtrar Vigencia (Opcional)
                                    </label>
                                    <select
                                        value={filtroAnioBusqueda}
                                        onChange={(e) => setFiltroAnioBusqueda(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-white text-slate-700"
                                    >
                                        <option value="">Todas las vigencias</option>
                                        {vigencias.map(v => (
                                            <option key={v.id} value={v.anio}>
                                                Año {v.anio} {v.activa ? "(Activa)" : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSearching || !busqueda.trim()}
                                    className="px-6 py-2.5 bg-blue-800 hover:bg-blue-900 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 h-[42px] disabled:bg-gray-400"
                                >
                                    {isSearching ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSearch} />}
                                    {isSearching ? "Buscando..." : "Buscar"}
                                </button>
                            </div>
                        </form>

                        {/* Selector de Resultados (Múltiples coincidencias) */}
                        {resultados.length > 1 && !estudiante && (
                            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 animate-fade-in-down shadow-sm">
                                <h3 className="text-sm font-bold text-yellow-800 mb-2 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faUsers} /> Se encontraron {resultados.length} coincidencias
                                </h3>
                                <p className="text-xs text-yellow-700 mb-3">Por favor, seleccione el estudiante correcto de la lista:</p>

                                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                                    {resultados.map(est => (
                                        <button
                                            key={est.id}
                                            type="button"
                                            onClick={() => seleccionarEstudiante(est, filtroAnioBusqueda)}
                                            className="w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-white p-3 rounded-lg border border-yellow-300 hover:bg-yellow-100 hover:border-yellow-400 transition-all text-left shadow-sm"
                                        >
                                            <div>
                                                <div className="font-bold text-slate-700 text-sm">{est.nombreCompleto}</div>
                                                {est.matriculas && est.matriculas.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {est.matriculas.map(m => (
                                                            <span
                                                                key={m.id}
                                                                className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium"
                                                            >
                                                                {m.anio}: {m.grado?.replace(/_/g, ' ')}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-600 font-mono bg-gray-100 px-2.5 py-1 rounded self-start sm:self-center shrink-0">
                                                Doc: {est.documento}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tarjeta de Configuración Individual */}
                        {estudiante && estudiante.matriculas && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in-up transition-all space-y-6">
                                {/* Info Estudiante */}
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 text-xl shrink-0">
                                            <FontAwesomeIcon icon={faUserGraduate} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-blue-900">{estudiante.nombreCompleto}</h3>
                                            <p className="text-xs text-blue-700">Documento: {estudiante.documento}</p>
                                        </div>
                                    </div>

                                    {resultados.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={volverALaLista}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                                        >
                                            Cambiar estudiante
                                        </button>
                                    )}
                                </div>

                                {/* Selectores de Tipo de Documento, Vigencia y Grado */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 mb-1 ml-1 flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faFileAlt} className="text-gray-400" /> Tipo de Documento
                                        </label>
                                        <select
                                            value={tipoDocumento}
                                            onChange={(e) => {
                                                setTipoDocumento(e.target.value);
                                                setConfig(prev => ({ ...prev, periodo: "" }));
                                            }}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-white font-medium text-slate-700"
                                        >
                                            <option value="MATRICULA">Constancia de Matrícula</option>
                                            <option value="NOTAS">Certificado de Estudios (Notas)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Vigencia (Año)</label>
                                        <select
                                            value={vigenciaSeleccionada}
                                            onChange={(e) => {
                                                const nuevoAnio = e.target.value;
                                                setVigenciaSeleccionada(nuevoAnio);
                                                const mats = estudiante.matriculas.filter(m => m.anio === Number(nuevoAnio));
                                                setConfig(prev => ({
                                                    ...prev,
                                                    matriculaId: mats.length === 1 ? String(mats[0].id) : "",
                                                    periodo: ""
                                                }));
                                            }}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                                        >
                                            <option value="">-- Seleccione el año --</option>
                                            {vigenciasDisponiblesEstudiante.map(anio => (
                                                <option key={anio} value={anio}>Año Lectivo {anio}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">Grado cursado</label>
                                        <select
                                            value={config.matriculaId}
                                            onChange={(e) => setConfig({ ...config, matriculaId: e.target.value, periodo: "" })}
                                            disabled={!vigenciaSeleccionada}
                                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-white disabled:bg-gray-100"
                                        >
                                            <option value="">-- Seleccione el grado --</option>
                                            {matriculasDelAnio.map(mat => (
                                                <option key={mat.id} value={mat.id}>
                                                    {mat.grado?.replace(/_/g, ' ')} {mat.grupo ? `(${mat.grupo})` : ''} - Sede {mat.sede}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <hr className="border-gray-100" />

                                {/* Opciones Específicas Dinámicas */}
                                <OpcionesDocumentoBox
                                    tipoDocumento={tipoDocumento}
                                    config={config}
                                    setConfig={setConfig}
                                    opcionesPeriodo={getOpcionesPeriodoIndividual()}
                                    habilitarPeriodo={Boolean(config.matriculaId)}
                                />

                                {/* Botón Generar */}
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleGenerar}
                                        disabled={botonDeshabilitado}
                                        className={`px-5 py-2.5 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm ${botonDeshabilitado
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700 active:scale-95'
                                            }`}
                                    >
                                        {isGenerating ? (
                                            <><FontAwesomeIcon icon={faSpinner} spin /> Generando...</>
                                        ) : (
                                            <><FontAwesomeIcon icon={faDownload} /> Descargar Documento</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ========================================================== */}
                {/* BLOQUE 2: EMISIÓN MASIVA POR GRUPO                         */}
                {/* ========================================================== */}
                {modoEmision === "MASIVO" && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in-up space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-700 mb-1 ml-1 flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faFileAlt} className="text-gray-400" /> Tipo de Documento
                                </label>
                                <select
                                    value={tipoDocumento}
                                    onChange={(e) => {
                                        setTipoDocumento(e.target.value);
                                        setReporteLote(null);
                                        setConfig(prev => ({ ...prev, periodo: "" }));
                                    }}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-white font-medium text-slate-700"
                                >
                                    <option value="MATRICULA">Constancias de Matrícula (Lote)</option>
                                    <option value="NOTAS">Certificados de Estudios / Notas (Lote)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">
                                    Vigencia (Año Lectivo) <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={masivoVigenciaId}
                                    onChange={(e) => setMasivoVigenciaId(e.target.value)}
                                    disabled={loadingCatalogos}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-white disabled:bg-gray-100"
                                >
                                    <option value="">-- Seleccione vigencia --</option>
                                    {vigencias.map(v => (
                                        <option key={v.id} value={v.id}>
                                            Año Lectivo {v.anio} {v.activa ? "(Activa)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">
                                    Sede <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={masivoSedeId}
                                    onChange={(e) => setMasivoSedeId(e.target.value)}
                                    disabled={!masivoVigenciaId || loadingCatalogos}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-white disabled:bg-gray-100"
                                >
                                    <option value="">-- Seleccione sede --</option>
                                    {sedes.map(s => (
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 ml-1">
                                    Grupo <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={masivoGrupoId}
                                    onChange={(e) => {
                                        setMasivoGrupoId(e.target.value);
                                        setReporteLote(null);
                                        setConfig(prev => ({ ...prev, periodo: "" }));
                                    }}
                                    disabled={!masivoSedeId || loadingGrupos}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-white disabled:bg-gray-100"
                                >
                                    <option value="">
                                        {loadingGrupos ? "Cargando grupos..." : "-- Seleccione grupo --"}
                                    </option>
                                    {gruposDisponibles.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.grado?.nombre?.replace(/_/g, ' ')} - Grupo {g.nombre} ({g.jornada})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Opciones Específicas Dinámicas */}
                        <OpcionesDocumentoBox
                            tipoDocumento={tipoDocumento}
                            config={config}
                            setConfig={setConfig}
                            opcionesPeriodo={getOpcionesPeriodoMasivo()}
                            habilitarPeriodo={Boolean(masivoGrupoId)}
                        />

                        {/* Botón Generar Lote */}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleGenerar}
                                disabled={botonDeshabilitado}
                                className={`px-6 py-2.5 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm ${botonDeshabilitado
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 active:scale-95'
                                    }`}
                            >
                                {isGenerating ? (
                                    <><FontAwesomeIcon icon={faSpinner} spin /> Generando lote PDF...</>
                                ) : (
                                    <><FontAwesomeIcon icon={faDownload} /> Generar y Descargar Lote (PDF)</>
                                )}
                            </button>
                        </div>

                        {/* Resumen de Generación Masiva / Estudiantes Omitidos */}
                        {reporteLote && (
                            <div
                                className={`p-4 rounded-xl border ${reporteLote.esErrorTotal
                                    ? "bg-red-50 border-red-200"
                                    : reporteLote.omitidos.length > 0
                                        ? "bg-amber-50 border-amber-200"
                                        : "bg-green-50 border-green-200"
                                    }`}
                            >
                                <div className="flex items-center gap-2 font-bold text-sm mb-2">
                                    <FontAwesomeIcon
                                        icon={reporteLote.omitidos.length > 0 ? faExclamationTriangle : faCheckCircle}
                                        className={
                                            reporteLote.esErrorTotal
                                                ? "text-red-600"
                                                : reporteLote.omitidos.length > 0
                                                    ? "text-amber-600"
                                                    : "text-green-600"
                                        }
                                    />
                                    <span className="text-slate-800">
                                        Resumen del Lote: {reporteLote.totalGenerados} generado(s) | {reporteLote.omitidos.length} omitido(s)
                                    </span>
                                </div>

                                {reporteLote.omitidos.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-xs text-slate-600 mb-2">
                                            Los siguientes estudiantes fueron omitidos automáticamente por no cumplir con las validaciones requeridas:
                                        </p>
                                        <div className="max-h-56 overflow-y-auto bg-white rounded-lg border border-gray-200">
                                            <table className="w-full text-left border-collapse text-xs">
                                                <thead>
                                                    <tr className="bg-gray-100 border-b border-gray-200 text-gray-600">
                                                        <th className="py-2 px-3">Documento</th>
                                                        <th className="py-2 px-3">Estudiante</th>
                                                        <th className="py-2 px-3">Motivo de Omisión</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reporteLote.omitidos.map((item, idx) => (
                                                        <tr key={`${item.documento}-${idx}`} className="border-b border-gray-100 last:border-b-0">
                                                            <td className="py-2 px-3 font-mono text-slate-600">{item.documento}</td>
                                                            <td className="py-2 px-3 font-medium text-slate-800">{item.nombreCompleto}</td>
                                                            <td className="py-2 px-3 text-amber-800">{item.motivo}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

/**
 * Subcomponente reutilizable para las opciones dinámicas del certificado
 */
const OpcionesDocumentoBox = ({ tipoDocumento, config, setConfig, opcionesPeriodo, habilitarPeriodo }) => {
    return (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
            {tipoDocumento === "MATRICULA" && (
                <>
                    <h4 className="text-sm font-bold text-gray-700">Opciones de la Constancia</h4>
                    <label className="flex items-center gap-2 cursor-pointer w-max">
                        <input
                            type="checkbox"
                            checked={config.iniciaronClases}
                            onChange={(e) => setConfig({ ...config, iniciaronClases: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 font-medium">¿Ya iniciaron clases?</span>
                    </label>

                    {config.iniciaronClases && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pl-6 border-l-2 border-blue-200 animate-fade-in">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Meses de asistencia (Opcional)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="11"
                                    value={config.meses}
                                    onChange={(e) => setConfig({ ...config, meses: e.target.value })}
                                    placeholder="Ej: 3"
                                    className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Comportamiento (Opcional)</label>
                                <input
                                    type="text"
                                    list="sugerencias-comportamiento"
                                    value={config.comportamiento}
                                    onChange={(e) => setConfig({ ...config, comportamiento: e.target.value.toUpperCase() })}
                                    placeholder="Ej: EXCELENTE"
                                    className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-white"
                                />
                                <datalist id="sugerencias-comportamiento">
                                    <option value="EXCELENTE" />
                                    <option value="SOBRESALIENTE" />
                                    <option value="BUENO" />
                                    <option value="ACEPTABLE" />
                                </datalist>
                            </div>
                        </div>
                    )}
                </>
            )}

            {tipoDocumento === "NOTAS" && (
                <div className="animate-fade-in">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">Opciones del Certificado</h4>
                    <label className="block text-xs text-gray-500 mb-1">
                        Periodo a Certificar <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={config.periodo}
                        onChange={(e) => setConfig({ ...config, periodo: e.target.value })}
                        disabled={!habilitarPeriodo}
                        className="w-full md:w-1/2 border border-gray-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-white disabled:bg-gray-100"
                    >
                        <option value="">-- Seleccione --</option>
                        {opcionesPeriodo.map(opt => (
                            <option key={opt.value} value={opt.value} className={opt.isFinal ? "font-bold text-blue-700" : ""}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export default CertificadosPage;