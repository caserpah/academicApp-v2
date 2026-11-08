import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUsersGear, faSchool, faExclamationTriangle, faCheckCircle, faTimes
} from "@fortawesome/free-solid-svg-icons";

import {
    fetchPromocionCatalogs, generarConsolidadoAnual, simularPromocion, verificarMatriculasActivas,
    ejecutarPromocionMasiva, verificarConsolidados, fetchGruposPorVigencia
} from "../../api/promocionService.js";
import { guardarCalificacionesMasivas } from "../../api/nivelacionesService.js";
import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import { formatearNombreGrupo } from "../../utils/formatters.js";

const PromocionMasiva = () => {
    // --- ESTADOS DE CATÁLOGOS ---
    const [sedes, setSedes] = useState([]);
    const [grados, setGrados] = useState([]);
    const [vigencias, setVigencias] = useState([]);
    const [vigenciaActiva, setVigenciaActiva] = useState(null);
    const [gruposDisponibles, setGruposDisponibles] = useState([]);

    // Filtros
    const [filters, setFilters] = useState({
        vigenciaId: '',
        sedeId: '',
        gradoId: '',
        grupoId: ''
    });

    // Estados de UI
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [isProcessingStep1, setIsProcessingStep1] = useState(false);
    const [isSimulatingStep2, setIsSimulatingStep2] = useState(false);
    const [isExecutingFinal, setIsExecutingFinal] = useState(false);
    const [step1Completado, setStep1Completado] = useState(false);

    // Datos
    const [simulacionData, setSimulacionData] = useState([]);
    const [excluidos, setExcluidos] = useState([]);

    // Control de Notas Faltantes
    const [showModalFaltantes, setShowModalFaltantes] = useState(false);
    const [dataFaltantes, setDataFaltantes] = useState([]);
    const [notasInputs, setNotasInputs] = useState({});
    const [notaMasiva, setNotaMasiva] = useState("");
    const [isSavingNotas, setIsSavingNotas] = useState(false);

    const getEtiquetaGrupoCorto = (grupo) => {
        if (!grupo) return "";
        const grupoFormateado = formatearNombreGrupo(`${grupo.nombre} | ${grupo.jornada}`);
        return grupoFormateado.replace(/MANANA/gi, "MAÑANA");
    };

    const handleToggleExcluir = (estudianteId) => {
        setExcluidos(prev =>
            prev.includes(estudianteId)
                ? prev.filter(id => id !== estudianteId)
                : [...prev, estudianteId]
        );
    };

    // --- CARGA INICIAL ---
    useEffect(() => {
        const init = async () => {
            try {
                setLoadingCatalogs(true);
                const data = await fetchPromocionCatalogs();
                setSedes(data.sedes);
                setGrados(data.grados);
                setVigencias(data.vigencias);

                const activa = data.vigencias.find(v => v.activa);
                setVigenciaActiva(activa);

                if (activa) setFilters(prev => ({ ...prev, vigenciaId: activa.id }));
                if (data.sedes.length === 1) setFilters(prev => ({ ...prev, sedeId: data.sedes[0].id }));
            } catch {
                showError("No se pudieron cargar los datos del sistema.");
            } finally {
                setLoadingCatalogs(false);
            }
        };
        init();
    }, []);

    // --- CASCADA: SEDE + GRADO + VIGENCIA -> GRUPOS DE ORIGEN ---
    useEffect(() => {
        const cargarGruposOrigen = async () => {
            if (!filters.sedeId || !filters.gradoId || !filters.vigenciaId) {
                setGruposDisponibles([]);
                return;
            }
            const gruposFiltrados = await fetchGruposPorVigencia(filters.vigenciaId, filters.sedeId, filters.gradoId);
            setGruposDisponibles(gruposFiltrados);

            setFilters(prev => {
                const valido = gruposFiltrados.find(g => String(g.id) === String(prev.grupoId));
                return !valido ? { ...prev, grupoId: '' } : prev;
            });
        };
        cargarGruposOrigen();
    }, [filters.sedeId, filters.gradoId, filters.vigenciaId]);

    // Verificar si el grupo seleccionado ya tiene consolidados generados
    useEffect(() => {
        const verificarEstadoGrupo = async () => {
            if (!filters.grupoId) {
                setStep1Completado(false);
                setSimulacionData([]);
                return;
            }
            try {
                const respuesta = await verificarConsolidados(filters.grupoId);
                const estadoCierre = respuesta?.consolidadosGenerados ?? respuesta?.data?.consolidadosGenerados ?? false;
                setStep1Completado(Boolean(estadoCierre));
            } catch {
                setStep1Completado(false);
            }
        };
        verificarEstadoGrupo();
    }, [filters.grupoId]);

    // --- HANDLERS ---
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (e.target.name === 'grupoId' || e.target.name === 'gradoId' || e.target.name === 'sedeId') {
            setStep1Completado(false);
            setSimulacionData([]);
            setExcluidos([]);
            setDataFaltantes([]);
        }
    };

    // PASO 1: Generar Consolidados
    const handleEjecutarPaso1 = async () => {
        if (!filters.sedeId || !filters.grupoId || !filters.gradoId) {
            return showWarning("Selecciona una sede, un grado y un grupo para continuar.");
        }

        setSimulacionData([]);

        try {
            setIsProcessingStep1(true);
            const validacion = await verificarMatriculasActivas(filters.grupoId, filters.vigenciaId);
            setIsProcessingStep1(false);
            const hayActivos = validacion?.data?.hayActivos ?? false;
            if (!hayActivos) return showWarning("No hay estudiantes con matrícula activa en este grupo.");
        } catch (error) {
            setIsProcessingStep1(false);
            return showError("Error al verificar la cantidad de estudiantes activos.", error);
        }

        let mensajeConfirmacion = "Esta acción calculará las notas definitivas de las áreas y enviará a nivelación a quienes reprueben máximo 2 áreas. ¿Deseas continuar?";
        let tituloConfirmacion = "Cierre de año";

        if (step1Completado) {
            mensajeConfirmacion = "⚠️ ¡ATENCIÓN! Este grupo ya tiene los consolidados anuales generados. Si continúa, se recalcularán todas las definitivas y podrías sobreescribir datos existentes. ¿Está seguro de que desea volver a generar los consolidados?";
            tituloConfirmacion = "Recalcular cierre anual";
        }

        if (excluidos.length > 0) {
            mensajeConfirmacion += `\n\nNota: Se excluirán temporalmente ${excluidos.length} estudiante(s) del cierre por situaciones pendientes.`;
        }

        const confirm = await showConfirm(
            mensajeConfirmacion, tituloConfirmacion, step1Completado ? "Sí, volver a generar" : "Sí, generar consolidados"
        );

        if (!confirm) return;

        try {
            setIsProcessingStep1(true);
            const resultado = await generarConsolidadoAnual(filters.sedeId, filters.gradoId, filters.grupoId, filters.vigenciaId, excluidos);
            const mensajeStr = resultado.message ? resultado.message.toLowerCase() : "";

            if (resultado.status === 'info' || mensajeStr.includes('carga académica')) {
                return showWarning(resultado.message);
            }

            if (resultado.status === 'warning') {
                showWarning(resultado.message);

                setStep1Completado(false); // Deshabilita y pone en gris el Paso 2 automáticamente
                setSimulacionData([]);     // Oculta la Mesa de Control vieja si existía

                if (resultado.data && resultado.data.length > 0) {
                    setDataFaltantes(resultado.data);
                    setShowModalFaltantes(true);
                }
                return;
            }

            if (excluidos.length > 0) {
                showWarning(`Consolidados generados. ATENCIÓN: ${excluidos.length} estudiante(s) quedó(aron) Pospuesto(s) por notas faltantes. Continúa con la simulación de promoción masiva.`);
            } else {
                showSuccess(resultado.message || "Consolidados procesados exitosamente. Continúa con la simulación de cierre.");
            }

            setStep1Completado(true);
            setExcluidos([]);
        } catch (error) {
            showError(error.message);
        } finally {
            setIsProcessingStep1(false);
        }
    };

    // PASO 2: Simular Dictámenes (Carga la tabla)
    const handleSimularPaso2 = async () => {
        if (!filters.sedeId || !filters.grupoId || !filters.gradoId) {
            return showWarning("Asegúrate de seleccionar la sede, el grado y el grupo.");
        }

        try {
            setIsSimulatingStep2(true);
            const resultado = await simularPromocion({
                sedeId: filters.sedeId,
                gradoId: filters.gradoId,
                grupoId: filters.grupoId,
                vigenciaId: filters.vigenciaId
            });

            setSimulacionData(resultado.data || resultado);

            if (!resultado.data || resultado.data.length === 0) {
                showWarning("No hay estudiantes con matrícula activa en este grupo.");
            } else {
                showSuccess("Simulación lista. Revise los dictámenes en la tabla inferior.");
            }
        } catch (error) {
            showError(error.message || "Error al simular el cierre.");
        } finally {
            setIsSimulatingStep2(false);
        }
    };

    // BOTÓN VERDE FINAL: Ejecutar Oficialización de Cierre
    const handleEjecutarPromocionFinal = async () => {
        const confirm = await showConfirm(
            "Está a punto de oficializar el cierre de año para este grupo. Esta acción actualizará los estados académicos definitivos en las matrículas actuales. ¿Está absolutamente seguro?",
            "Oficializar Cierre de Año",
            "Sí, Oficializar Cierre"
        );

        if (!confirm) return;

        try {
            setIsExecutingFinal(true);

            // Payload purificado: Solo los datos estrictamente necesarios para sellar el año
            const payload = simulacionData
                .filter(est => est.dictamenSugerido !== 'PENDIENTE' && est.dictamenSugerido !== 'POSPUESTO')
                .map(est => ({
                    matriculaId: est.matriculaId,
                    estadoFinal: est.dictamenSugerido
                }));

            if (payload.length === 0) {
                setIsExecutingFinal(false);
                return showWarning("Todos los estudiantes están pendientes. No hay dictámenes definitivos para oficializar aún.");
            }

            const resultado = await ejecutarPromocionMasiva({ listaAprobada: payload });
            const mensajeFinal = resultado.message || resultado.mensaje || `¡Proceso Exitoso! Se oficializaron ${payload.length} registros.`;

            showSuccess(mensajeFinal);
            setSimulacionData([]);
            setStep1Completado(false);

        } catch (error) {
            showError(error.message || "Error al oficializar el cierre de año.");
        } finally {
            setIsExecutingFinal(false);
        }
    };

    // --- HANDLERS DE NOTAS FALTANTES ---
    const handleInputChange = (estudianteId, asignaturaId, value) => {
        setNotasInputs(prev => ({
            ...prev,
            [`${estudianteId}-${asignaturaId}`]: value
        }));
    };

    const handleAplicarMasivo = () => {
        if (!notaMasiva || isNaN(notaMasiva) || notaMasiva < 1 || notaMasiva > 5) {
            return showWarning("Por favor ingresa una nota válida entre 1.0 y 5.0 para el llenado masivo.");
        }
        const nuevosInputs = {};
        dataFaltantes.forEach(falta => {
            nuevosInputs[`${falta.estudianteId}-${falta.asignaturaId}`] = notaMasiva;
        });
        setNotasInputs(nuevosInputs);
        showSuccess(`Se aplicó la nota ${notaMasiva} a todos los registros.`);
    };

    const handleCerrarModalFaltantes = () => {
        setNotasInputs({});
        setNotaMasiva("");
        setShowModalFaltantes(false);
        showWarning("Atención: Debes hacer clic nuevamente en Generar Consolidados para recalcular el grupo y continuar.");
    };

    const handleGuardarNotasFaltantes = async () => {
        const payloadNotas = [];
        try {
            for (const falta of dataFaltantes) {
                if (excluidos.includes(falta.estudianteId)) continue;
                const notaValue = notasInputs[`${falta.estudianteId}-${falta.asignaturaId}`];

                if (!notaValue || String(notaValue).trim() === "") {
                    return showWarning(`Aún existen campos vacíos. Ingrese la nota para ${falta.estudiante} o márquelo como Pospuesto.`);
                }
                if (notaValue < 1 || notaValue > 5) {
                    return showWarning(`La nota de ${falta.estudiante} debe estar entre 1.0 y 5.0.`);
                }

                const periodosArray = String(falta.periodos).split('-').map(p => Number(p.trim()));
                periodosArray.forEach(periodo => {
                    payloadNotas.push({
                        estudianteId: falta.estudianteId,
                        asignaturaId: falta.asignaturaId,
                        periodo: periodo,
                        notaDefinitiva: parseFloat(notaValue)
                    });
                });
            }

            if (payloadNotas.length > 0) {
                setIsSavingNotas(true);
                const respuesta = await guardarCalificacionesMasivas(payloadNotas);
                showSuccess(respuesta.message || "Calificaciones guardadas. Haz clic nuevamente en Generar Consolidados para recalcular el grupo.");
            } else if (excluidos.length > 0) {
                showWarning("Estudiantes pospuestos. Haz clic nuevamente en Generar Consolidados para aplicar los cambios.");
            }

            setShowModalFaltantes(false);
            setNotasInputs({});
            setNotaMasiva("");
            setDataFaltantes([]);

        } catch (error) {
            showError(error.message || "Error al procesar el guardado de notas.");
        } finally {
            setIsSavingNotas(false);
        }
    };

    // Contadores visuales
    const resumen = {
        promovidos: simulacionData.filter(e => e.dictamenSugerido === 'PROMOVIDO').length,
        reprobados: simulacionData.filter(e => e.dictamenSugerido === 'REPROBADO').length,
        pendientes: simulacionData.filter(e => e.dictamenSugerido === 'PENDIENTE').length,
        pospuestos: simulacionData.filter(e => e.dictamenSugerido === 'POSPUESTO').length,
    };

    if (loadingCatalogs) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Encabezado */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-2 border-b border-gray-300">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faUsersGear} className="text-blue-600 mr-3" />
                        Cierre de Año Académico
                    </h1>
                    {vigenciaActiva && (
                        <div className="text-sm font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200">
                            Año Lectivo: <span className="text-blue-900">{vigenciaActiva.anio}</span>
                        </div>
                    )}
                </div>

                {/* Filtros Contextuales */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 tracking-wider">Selección del Grupo a Evaluar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Vigencia <span className="text-red-500">*</span></label>
                            <select name="vigenciaId" value={filters.vigenciaId} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none bg-blue-50 text-blue-900 font-semibold">
                                {vigencias.map(v => <option key={v.id} value={v.id}>{v.anio} {v.activa ? "(Activa)" : ""}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Sede <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select name="sedeId" value={filters.sedeId} onChange={handleFilterChange} className="w-full border border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-2.5 pl-8 text-sm outline-none">
                                    <option value="">-- Seleccione --</option>
                                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                                <FontAwesomeIcon icon={faSchool} className="absolute left-3 top-3 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Grado <span className="text-red-500">*</span></label>
                            <select name="gradoId" value={filters.gradoId} onChange={handleFilterChange} disabled={!filters.sedeId} className="w-full border border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-2.5 text-sm outline-none disabled:bg-gray-100">
                                <option value="">-- Seleccione --</option>
                                {grados.map(g => <option key={g.id} value={g.id}>{g.nombre.replace(/_/g, " ")}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Grupo <span className="text-red-500">*</span></label>
                            <select name="grupoId" value={filters.grupoId} onChange={handleFilterChange} disabled={!filters.gradoId} className="w-full border border-gray-300 focus:ring-blue-500 focus:border-blue-500 rounded-lg p-2.5 text-sm outline-none disabled:bg-gray-100">
                                <option value="">-- Seleccione --</option>
                                {gruposDisponibles.map(g => <option key={g.id} value={g.id}>{getEtiquetaGrupoCorto(g)}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tarjetas de Ejecución */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* PASO 1 */}
                    <div className={`p-6 rounded-xl border-2 transition-all ${step1Completado ? 'bg-green-50/60 border-green-200' : 'bg-white border-blue-200 shadow-md'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${step1Completado ? 'bg-green-200 text-green-700' : 'bg-blue-600 text-white'}`}>
                                {step1Completado ? <FontAwesomeIcon icon={faCheckCircle} /> : "1"}
                            </div>
                            <div>
                                <h3 className={`font-bold ${step1Completado ? 'text-green-800' : 'text-blue-900'}`}>Cierre de Año / Consolidados</h3>
                                <p className="text-xs text-gray-500 mt-0.5">Calcula Período Final y define nivelaciones.</p>
                            </div>
                        </div>

                        <button
                            onClick={handleEjecutarPaso1}
                            disabled={isProcessingStep1}
                            className={`w-full py-3 px-4 rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-all text-white ${step1Completado ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {/* {isProcessingStep1 ? <LoadingSpinner size="small" color="white" /> : <FontAwesomeIcon icon={faCogs} />} */}
                            {step1Completado ? "Volver a Generar Consolidados" : "Generar Consolidados"}
                        </button>
                    </div>

                    {/* PASO 2 */}
                    <div className={`p-6 rounded-xl bg-white shadow-md border-2 transition-all ${!step1Completado ? 'border-gray-200 opacity-70 grayscale' : 'border-red-200'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${!step1Completado ? 'bg-gray-200 text-gray-500' : 'bg-red-500 text-white'}`}>
                                2
                            </div>
                            <div className="flex-1">
                                <h3 className={`font-bold ${!step1Completado ? 'text-gray-500' : 'text-red-800'}`}>Simular Promoción</h3>
                                <p className="text-xs text-gray-500 mt-1">Calcula el estado académico final del año actual.</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSimularPaso2}
                            disabled={isSimulatingStep2 || !step1Completado}
                            className="w-full py-3 px-4 rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-all text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:bg-gray-400"
                        >
                            {/* {isSimulatingStep2 ? <LoadingSpinner size="small" color="white" /> : <FontAwesomeIcon icon={faTableList} />} */}
                            Simular Promoción Masiva
                        </button>
                    </div>
                </div>

                {/* MESA DE CONTROL */}
                {simulacionData.length > 0 && (
                    <div className="mt-8 border rounded-xl overflow-hidden shadow-md bg-white border-blue-200 animate-fade-in">
                        <div className="bg-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h3 className="text-white font-bold text-lg">Mesa de Control de Cierre</h3>
                                <p className="text-slate-300 text-sm mt-1">
                                    Verifique el dictamen final del año lectivo para cada estudiante.
                                </p>
                            </div>
                            {/* INSIGNIAS */}
                            <div className="flex gap-2 flex-wrap">
                                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                                    🟢 Promovidos: {resumen.promovidos}
                                </span>
                                <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full">
                                    🔴 Reprobados: {resumen.reprobados}
                                </span>
                                {resumen.pendientes > 0 && (
                                    <span className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-full border border-gray-300">
                                        🟡 Pendientes: {resumen.pendientes}
                                    </span>
                                )}
                                {resumen.pospuestos > 0 && (
                                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-300">
                                        ⚪ Pospuestos: {resumen.pospuestos}
                                    </span>
                                )}
                            </div>
                        </div>

                        {resumen.pospuestos > 0 && (
                            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-start gap-3">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 mt-0.5" />
                                <p className="text-sm text-amber-800">
                                    <strong>Atención:</strong> Hay <strong>{resumen.pospuestos} estudiante(s) en estado POSPUESTO</strong>. La oficialización del cierre no los incluirá hasta que se resuelvan sus notas.
                                </p>
                            </div>
                        )}

                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-center font-bold text-gray-700 w-12">#</th>
                                        <th className="px-6 py-3 text-left font-bold text-gray-700">Estudiante</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-700">Áreas Perdidas</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-700">Dictamen Final</th>
                                        <th className="px-6 py-3 text-left font-bold text-gray-700">Observaciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {simulacionData.map((est, index) => {
                                        const esPendiente = est.dictamenSugerido === 'PENDIENTE';
                                        const esPospuesto = est.dictamenSugerido === 'POSPUESTO';
                                        const esReprobado = est.dictamenSugerido === 'REPROBADO';
                                        const esGraduando = est.esGraduando; // Restauramos la variable del egresado

                                        return (
                                            <tr key={est.matriculaId} className={esPendiente ? "bg-gray-50 opacity-60" : "hover:bg-blue-50/40 transition-colors"}>
                                                <td className="px-4 py-4 text-center font-bold text-gray-500">{index + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-800">{est.nombreEstudiante}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">Doc: {est.documento}</div>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`font-bold ${est.areasPerdidas >= 3 ? 'text-red-600' : est.areasPerdidas > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                                        {est.areasPerdidas}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold inline-block w-28 ${(esPendiente || esPospuesto) ? 'bg-gray-200 text-gray-700' : esReprobado ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                                        {est.dictamenSugerido}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {(esPendiente || esPospuesto) ? (
                                                        <span className="text-xs text-gray-500 italic bg-gray-100 px-3 py-1 rounded">
                                                            {esPendiente ? "Pendiente de Nivelación" : "Le faltan calificaciones"}
                                                        </span>
                                                    ) : esGraduando ? (
                                                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
                                                            Finaliza Académicamente (Egresado)
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400 italic">
                                                            Cierre regular
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-5 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button
                                onClick={handleEjecutarPromocionFinal}
                                disabled={isExecutingFinal}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                            >
                                {/* {isExecutingFinal ? <LoadingSpinner size="small" color="white" /> : <FontAwesomeIcon icon={faCheckCircle} />} */}
                                {isExecutingFinal ? "Oficializando..." : "Oficializar Cierre de Año"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL DE NOTAS FALTANTES */}
            {showModalFaltantes && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border-t-4 border-amber-500">
                        <div className="p-5 border-b border-gray-200 bg-amber-50 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-amber-800 flex items-center gap-2">
                                    <FontAwesomeIcon icon={faExclamationTriangle} />
                                    Bloqueo: Calificaciones Faltantes Detectadas
                                </h2>
                                <p className="text-sm text-amber-700 mt-1">
                                    No se puede procesar el consolidado. Ingrese las calificaciones o posponga al estudiante.
                                </p>
                            </div>
                            <button onClick={handleCerrarModalFaltantes} className="text-gray-400 hover:text-red-500 transition-colors">
                                <FontAwesomeIcon icon={faTimes} size="lg" />
                            </button>
                        </div>
                        <div className="p-0 overflow-y-auto flex-1">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-bold text-gray-600">Estudiante</th>
                                        <th className="px-4 py-3 text-left font-bold text-gray-600">Asignatura</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-600">Periodo</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-600">Calificación</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-600">Posponer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {dataFaltantes.map((falta, i) => {
                                        const isExcluido = excluidos.includes(falta.estudianteId);
                                        const mostrarNombre = i === 0 || dataFaltantes[i - 1].estudiante !== falta.estudiante;
                                        const inputKey = `${falta.estudianteId}-${falta.asignaturaId}`;

                                        return (
                                            <tr key={i} className={`${mostrarNombre && i !== 0 ? 'border-t-2 border-gray-300' : ''} ${isExcluido ? 'bg-red-50' : 'hover:bg-amber-50/30'}`}>
                                                <td className={`px-4 py-3 font-medium ${isExcluido ? 'text-red-800' : 'text-gray-800'}`}>
                                                    {mostrarNombre ? falta.estudiante : ''}
                                                </td>
                                                <td className={`px-4 py-3 ${isExcluido ? 'text-red-600' : 'text-gray-600'}`}>{falta.asignatura}</td>
                                                <td className="px-4 py-3 text-center font-bold text-red-500">{falta.periodos}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number" step="0.1" min="1" max="5" placeholder="Ej: 1.0"
                                                        disabled={isSavingNotas || isExcluido}
                                                        value={notasInputs[inputKey] || ''}
                                                        onChange={(e) => handleInputChange(falta.estudianteId, falta.asignaturaId, e.target.value)}
                                                        className={`w-20 border rounded p-1 text-center text-sm outline-none transition-colors ${isExcluido ? 'bg-gray-200 border-gray-300' : 'border-gray-300 focus:border-blue-500 bg-white'}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <label className="flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-red-600 hover:text-red-700">
                                                        <input
                                                            type="checkbox" className="w-4 h-4 cursor-pointer accent-red-600"
                                                            checked={isExcluido} onChange={() => handleToggleExcluir(falta.estudianteId)} disabled={isSavingNotas}
                                                        />
                                                        {isExcluido ? "Pospuesto" : "Posponer"}
                                                    </label>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-600">Llenado Masivo:</span>
                                <input
                                    type="number" step="0.1" min="1" max="5" placeholder="Ej: 1.0"
                                    value={notaMasiva} onChange={(e) => setNotaMasiva(e.target.value)} disabled={isSavingNotas}
                                    className="w-20 border border-gray-300 rounded p-1.5 text-center text-sm outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={handleAplicarMasivo} disabled={isSavingNotas}
                                    className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-700 transition"
                                >
                                    Aplicar a todos
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleCerrarModalFaltantes} disabled={isSavingNotas} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-bold transition">Cancelar</button>
                                <button onClick={handleGuardarNotasFaltantes} disabled={isSavingNotas} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition flex items-center gap-2">
                                    {isSavingNotas ? "Guardando..." : "Guardar Notas y Continuar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* OVERLAY DE CARGA PANTALLA COMPLETA */}
            {(isProcessingStep1 || isSimulatingStep2 || isExecutingFinal) && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-sm animate-fade-in">
                    <LoadingSpinner size="large" color="white" />
                    <h2 className="text-white mt-4 text-xl font-bold tracking-wide">
                        {isProcessingStep1 && "Calculando notas definitivas..."}
                        {isSimulatingStep2 && "Simulando dictámenes académicos..."}
                        {isExecutingFinal && "Oficializando matrículas en base de datos..."}
                    </h2>
                    <p className="text-slate-300 text-sm mt-2">Por favor, no cierres esta ventana.</p>
                </div>
            )}
        </div>
    );
};

export default PromocionMasiva;