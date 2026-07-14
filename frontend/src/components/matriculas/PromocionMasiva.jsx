import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faUsersGear, faCogs, faSchool, faExclamationTriangle, faCheckCircle, faTimes, faTableList, faBolt
} from "@fortawesome/free-solid-svg-icons";

import {
    fetchPromocionCatalogs, generarConsolidadoAnual, simularPromocion, ejecutarPromocionMasiva, verificarConsolidados
} from "../../api/promocionService.js";
import { guardarCalificacionesMasivas } from "../../api/nivelacionesService.js";
import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import { formatearNombreGrupo } from "../../utils/formatters.js";

const PromocionMasiva = () => {
    // --- ESTADOS DE CATÁLOGOS ---
    const [sedes, setSedes] = useState([]);
    const [grados, setGrados] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [vigencias, setVigencias] = useState([]);
    const [vigenciaActiva, setVigenciaActiva] = useState(null);

    // Listas dinámicas
    const [gruposDisponibles, setGruposDisponibles] = useState([]);

    // Filtros
    const [filters, setFilters] = useState({
        sedeId: '',
        gradoId: '',
        grupoId: '',
        vigenciaDestinoId: ''
    });

    // Estados de UI
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);
    const [isProcessingStep1, setIsProcessingStep1] = useState(false);
    const [isSimulatingStep2, setIsSimulatingStep2] = useState(false);
    const [isExecutingFinal, setIsExecutingFinal] = useState(false);

    // Control de la Mesa de Control (Fase 2)
    const [simulacionData, setSimulacionData] = useState([]);

    // Control de Notas Faltantes
    const [showModalFaltantes, setShowModalFaltantes] = useState(false);
    const [dataFaltantes, setDataFaltantes] = useState([]);

    // Control de Notas Individuales
    const [notasInputs, setNotasInputs] = useState({});
    const [notaMasiva, setNotaMasiva] = useState("");
    const [isSavingNotas, setIsSavingNotas] = useState(false);

    // Control de flujo visual
    const [step1Completado, setStep1Completado] = useState(false);

    // Estado para manejar a los estudiantes que se pospondrán del cierre
    const [excluidos, setExcluidos] = useState([]);

    // Genera la etiqueta del grupo con Sede y grado
    const getEtiquetaGrupoCorto = (grupo) => {
        if (!grupo) return "";
        const grupoFormateado = formatearNombreGrupo(`${grupo.nombre} | ${grupo.jornada}`);
        return grupoFormateado.replace(/MANANA/gi, "MAÑANA");
    };

    // Etiqueta COMPLETA (Para la Mesa de Control y Asignación Masiva)
    const getEtiquetaGrupoCompleto = (grupo) => {
        if (!grupo) return "";
        const nombreSede = sedes.find(s => String(s.id) === String(grupo.sedeId))?.nombre || '';
        const nombreGrado = grados.find(g => String(g.id) === String(grupo.gradoId))?.nombre.replace(/_/g, " ") || '';

        const grupoFormateado = formatearNombreGrupo(`${grupo.nombre} | ${grupo.jornada}`);

        return `${nombreSede} - ${nombreGrado} - ${grupoFormateado}`.replace(/MANANA/gi, "MAÑANA");
    };

    // Filtra las vigencias dependiendo de si el grado es Semestral (Ciclos) o Anual
    const getVigenciasFiltradas = () => {
        if (!vigenciaActiva || !filters.gradoId) return [];

        const gradoSeleccionado = grados.find(g => String(g.id) === String(filters.gradoId));
        const esCiclo = gradoSeleccionado && gradoSeleccionado.nombre.toUpperCase().includes('CICLO');

        return vigencias.filter(v => {
            if (esCiclo) {
                // Ciclos promueven en la misma vigencia
                return String(v.id) === String(vigenciaActiva.id);
            } else {
                // Grados regulares promueven al año siguiente
                return parseInt(v.anio) === parseInt(vigenciaActiva.anio) + 1;
            }
        });
    };

    // Función para marcar/desmarcar a un estudiante de la exclusión
    const handleToggleExcluir = (estudianteId) => {
        setExcluidos(prev =>
            prev.includes(estudianteId)
                ? prev.filter(id => id !== estudianteId) // Lo quitamos
                : [...prev, estudianteId]                // Lo agregamos
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
                setGrupos(data.grupos);
                setVigencias(data.vigencias);

                const activa = data.vigencias.find(v => v.activa);
                setVigenciaActiva(activa);

                if (data.sedes.length === 1) {
                    setFilters(prev => ({ ...prev, sedeId: data.sedes[0].id }));
                }
            } catch (error) {
                console.error("Error cargando catálogos para promoción masiva:", error);
                showError("No se pudieron cargar los datos del sistema.");
            } finally {
                setLoadingCatalogs(false);
            }
        };
        init();
    }, []);

    // --- CASCADA: SEDE + GRADO -> GRUPO ---
    useEffect(() => {
        if (!filters.sedeId) {
            setGruposDisponibles([]);
            return;
        }

        // 1. Filtramos los grupos según la sede seleccionada
        let filtrados = grupos.filter(g => String(g.sedeId) === String(filters.sedeId));

        // 2. Si hay grado seleccionado, aplicamos el segundo filtro
        if (filters.gradoId) {
            filtrados = filtrados.filter(g => String(g.gradoId) === String(filters.gradoId));
        }

        setGruposDisponibles(filtrados);

        // 3. Validamos que el grupo seleccionado siga siendo válido con los nuevos filtros. Si no es válido, lo reseteamos.
        setFilters(prev => {
            const valido = filtrados.find(g => String(g.id) === String(prev.grupoId));
            // Si el grupo actual no es válido con los nuevos filtros, lo reseteamos a vacío. De lo contrario, mantenemos el valor actual.
            return !valido ? { ...prev, grupoId: '' } : prev;
        });

    }, [filters.sedeId, filters.gradoId, grupos]);

    // Verificar si el grupo seleccionado ya tiene consolidados generados
    useEffect(() => {
        const verificarEstadoGrupo = async () => {
            if (!filters.grupoId) {
                setStep1Completado(false);
                setSimulacionData([]);
                return;
            }
            try {
                // Guardamos la respuesta completa sin desestructurar todavía
                const respuesta = await verificarConsolidados(filters.grupoId);

                // Extracción segura (Busca en la raíz, en .data, o devuelve false por defecto)
                const estadoCierre = respuesta?.consolidadosGenerados ?? respuesta?.data?.consolidadosGenerados ?? false;

                // Actualizamos el estado
                setStep1Completado(Boolean(estadoCierre));

            } catch (error) {
                console.error("Error verificando consolidados", error);
                setStep1Completado(false);
            }
        };

        verificarEstadoGrupo();
    }, [filters.grupoId]);

    // --- HANDLERS ---
    const handleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
        // Si el usuario cambia de grupo, reseteamos el estado de éxito del paso 1
        if (e.target.name === 'grupoId' || e.target.name === 'gradoId' || e.target.name === 'sedeId') {
            setStep1Completado(false);
            setSimulacionData([]);

            setExcluidos([]);             // Olvidamos cualquier pospuesto del grupo anterior
            setDataFaltantes([]);         // Olvidamos cualquier nota faltante del grupo anterior

            // Limpiar vigencia destino si cambian el grado para forzar validación de filtro nuevo
            if (e.target.name === 'gradoId') {
                setFilters(prev => ({ ...prev, vigenciaDestinoId: '' }));
            }
        }
    };

    // PASO 1: Generar Consolidados
    const handleEjecutarPaso1 = async () => {
        if (!filters.sedeId || !filters.grupoId || !filters.gradoId) {
            return showWarning("Selecciona una sede, un grado y un grupo para continuar.");
        }

        // Si ya está completado, preparamos un mensaje de alerta mucho más fuerte
        let mensajeConfirmacion = "Esta acción calculará las notas del Período Final (Definitivas) y enviará a nivelación a quienes reprueben. ¿Deseas continuar?";
        let tituloConfirmacion = "Cierre de Año";

        if (step1Completado) {
            mensajeConfirmacion = "⚠️ ¡ATENCIÓN! Este grupo YA tiene los consolidados anuales generados. Si continúa, se recalcularán todas las definitivas y podrías sobreescribir procesos existentes. ¿Está seguro de que desea VOLVER A GENERAR los consolidados?";
            tituloConfirmacion = "Recalcular Cierre Anual";
        }

        // Si hay estudiantes en la lista de excluidos, se lo advertimos
        if (excluidos.length > 0) {
            mensajeConfirmacion += `\n\nNota: Se excluirán temporalmente ${excluidos.length} estudiante(s) del cierre por situaciones pendientes.`;
        }

        const confirm = await showConfirm(
            mensajeConfirmacion,
            tituloConfirmacion,
            step1Completado ? "Sí, volver a generar" : "Sí, generar consolidados"
        );

        if (!confirm) return;

        try {
            setIsProcessingStep1(true);
            const resultado = await generarConsolidadoAnual(filters.sedeId, filters.gradoId, filters.grupoId, excluidos);

            // Si el backend advierte que faltan notas, detenemos todo y abrimos el modal
            if (resultado.status === 'warning') {
                showWarning(resultado.message);
                setDataFaltantes(resultado.data); // Guardamos el JSON de faltantes
                setShowModalFaltantes(true);      // Abrimos el modal
                setIsProcessingStep1(false);
                return; // Frenamos la ejecución aquí
            }

            // Si pasa limpio, entonces sí mostramos éxito
            showSuccess(resultado.message || "Consolidados procesados exitosamente.");
            setStep1Completado(true);
            setExcluidos([]); // Limpiamos la lista de excluidos porque el cierre fue un éxito
        } catch (error) {
            showError(error.message);
        } finally {
            setIsProcessingStep1(false);
        }
    };

    // PASO 2.A: Simular Promoción (Carga la tabla)
    const handleSimularPaso2 = async () => {
        if (!filters.sedeId || !filters.grupoId || !filters.gradoId || !filters.vigenciaDestinoId) {
            return showWarning("Asegúrate de seleccionar la sede, el grupo, el grado y la vigencia destino.");
        }

        try {
            setIsSimulatingStep2(true);
            // Invocamos el simulador del backend enviándole el contexto
            const resultado = await simularPromocion({
                sedeId: filters.sedeId,
                gradoId: filters.gradoId,
                grupoId: filters.grupoId,
                vigenciaId: vigenciaActiva.id
            });

            // Guardamos el JSON devuelto en el estado para renderizar la tabla
            setSimulacionData(resultado.data || resultado);
            showSuccess("Simulación lista. Revise y asigne los grupos destino en la tabla inferior.");
        } catch (error) {
            showError(error.message || "Error al simular la promoción.");
        } finally {
            setIsSimulatingStep2(false);
        }
    };

    // Función para que el coordinador asigne un grupo manualmente en la tabla
    const handleCambiarGrupoDestino = (matriculaId, nuevoGrupoId) => {
        setSimulacionData(prevData =>
            prevData.map(est =>
                est.matriculaId === matriculaId
                    ? { ...est, grupoDestinoSugeridoId: nuevoGrupoId }
                    : est
            )
        );
    };

    // ASIGNACIÓN MASIVA: Actualiza a todos los PROMOVIDOS de un solo golpe
    const handleAsignacionMasivaPromovidos = (nuevoGrupoId) => {
        if (!nuevoGrupoId) return;
        setSimulacionData(prevData =>
            prevData.map(est =>
                est.dictamenSugerido === 'PROMOVIDO' && !est.esGraduando
                    ? { ...est, grupoDestinoSugeridoId: nuevoGrupoId }
                    : est
            )
        );
        showSuccess("Grupo asignado masivamente a todos los promovidos.");
    };

    // PASO 2.B: Ejecutar Promoción Definitiva (El Botón Verde Final)
    const handleEjecutarPromocionFinal = async () => {
        // Identificamos si hay estudiantes sin grupo asignado
        const estudiantesFaltanGrupo = simulacionData.filter(est =>
            est.dictamenSugerido !== "PENDIENTE" && // Los pendientes se ignoran
            !est.esGraduando &&                     // Los graduados no necesitan grupo
            !est.grupoDestinoSugeridoId             // Le falta el select
        );

        const destino = vigencias.find(v => String(v.id) === String(filters.vigenciaDestinoId));
        let mensajeConfirmacion = "";
        let tituloConfirmacion = "";

        if (estudiantesFaltanGrupo.length > 0) {
            tituloConfirmacion = "Ejecución Parcial de Promoción";
            mensajeConfirmacion = `⚠️ ATENCIÓN: Hay ${estudiantesFaltanGrupo.length} estudiante(s) sin grupo de destino asignado.\n\nSi continúa, el año actual de estos estudiantes se cerrará correctamente (como Promovidos o Reprobados), pero NO se les generará prematrícula automática para el grado siguiente del año lectivo ${destino.anio}.\n\n¿Desea continuar de todos modos?`;
        } else {
            tituloConfirmacion = "Confirmar Promoción Definitiva";
            mensajeConfirmacion = `Está a punto de ejecutar la promoción definitiva hacia el año lectivo ${destino.anio}. Esta acción registrará las prematrículas. ¿Está absolutamente seguro?`;
        }

        const confirm = await showConfirm(
            mensajeConfirmacion,
            tituloConfirmacion,
            "Sí, Ejecutar Promoción"
        );

        if (!confirm) return;

        try {
            setIsExecutingFinal(true);

            // Preparamos el payload mapeando las llaves exactas que espera tu backend actualizado
            const payload = simulacionData
                .filter(est => est.dictamenSugerido !== 'PENDIENTE')
                .map(est => ({
                    matriculaViejaId: est.matriculaId,
                    estadoFinal: est.dictamenSugerido,
                    estudianteId: est.estudianteId,
                    sedeId: filters.sedeId,
                    metodologia: est.metodologia,
                    grupoDestinoId: est.grupoDestinoSugeridoId || null,
                    gradoDestinoId: est.grupoDestinoSugeridoId ? est.gradoDestinoSugeridoId : null,
                    vigenciaDestinoId: est.grupoDestinoSugeridoId ? est.vigenciaDestinoSugeridaId : null
                }));

            if (payload.length === 0) {
                setIsExecutingFinal(false);
                return showWarning("Todos los estudiantes están pendientes de nivelación. No hay promociones o reprobaciones definitivas para ejecutar aún.");
            }

            // Enviamos todo el paquete ya estructurado
            const resultado = await ejecutarPromocionMasiva({ listaAprobada: payload });

            const mensajeFinal = resultado.message || resultado.mensaje || `¡Proceso Exitoso! Se procesaron ${resultado.data?.procesados || 0} registros.`;

            showSuccess(mensajeFinal);

            // Limpiamos la tabla para evitar doble ejecución
            setSimulacionData([]);
            setStep1Completado(false);

        } catch (error) {
            showError(error.message || "Error al procesar la promoción definitiva.");
        } finally {
            setIsExecutingFinal(false);
        }
    };

    // --- HANDLERS DE NOTAS FALTANTES (Sin cambios) ---
    const handleInputChange = (estudianteId, asignaturaId, value) => {
        setNotasInputs(prev => ({
            ...prev,
            [`${estudianteId}-${asignaturaId}`]: value
        }));
    };

    // Aplicar una misma nota a todos los campos vacíos (Llenado Masivo)
    const handleAplicarMasivo = () => {
        if (!notaMasiva || isNaN(notaMasiva) || notaMasiva < 1 || notaMasiva > 5) {
            return showWarning("Por favor ingresa una nota válida entre 1.0 y 5.0 para el llenado masivo.");
        }

        const nuevosInputs = {};
        dataFaltantes.forEach(falta => {
            nuevosInputs[`${falta.estudianteId}-${falta.asignaturaId}`] = notaMasiva;
        });

        setNotasInputs(nuevosInputs);
        showSuccess(`Se aplicó la nota ${notaMasiva} a todos los registros del listado.`);
    };

    // Cerrar el modal de faltantes y limpiar los estados relacionados
    const handleCerrarModalFaltantes = () => {
        setExcluidos([]);             // Limpia los checkboxes de "Pospuesto"
        setNotasInputs({});           // Limpia las notas escritas
        setNotaMasiva("");            // Limpia el input de llenado masivo
        setShowModalFaltantes(false); // Oculta el modal
    };

    // Enviar el paquete de notas consolidadas al Backend
    const handleGuardarNotasFaltantes = async () => {
        const payloadNotas = [];

        try {
            // Recorremos las filas para estructurar el JSON plano que requiere la BD
            for (const falta of dataFaltantes) {
                if (excluidos.includes(falta.estudianteId)) continue; // Si el estudiante está excluido, saltamos sus campos

                const notaValue = notasInputs[`${falta.estudianteId}-${falta.asignaturaId}`];

                if (!notaValue || String(notaValue).trim() === "") {
                    return showWarning(`Aún existen campos vacíos. Por favor ingrese la nota para ${falta.estudiante} o márquelo como Pospuesto.`);
                }

                if (notaValue < 1 || notaValue > 5) {
                    return showWarning(`La nota de ${falta.estudiante} debe estar en el rango de 1.0 a 5.0.`);
                }

                // Convertimos la cadena de periodos a un array de números, eliminando espacios y convirtiendo a Number
                const periodosArray = String(falta.periodos).split('-').map(p => Number(p.trim()));

                // Si la fila reporta múltiples periodos faltantes (ej: [3, 4]), creamos un registro para cada uno
                periodosArray.forEach(periodo => {
                    payloadNotas.push({
                        estudianteId: falta.estudianteId,
                        asignaturaId: falta.asignaturaId,
                        periodo: periodo,
                        notaDefinitiva: parseFloat(notaValue)
                    });
                });
            }
            // Solo hacemos la petición masiva si hay notas válidas por guardar
            if (payloadNotas.length > 0) {
                setIsSavingNotas(true);
                const respuesta = await guardarCalificacionesMasivas(payloadNotas);
                showSuccess(respuesta.message || "Calificaciones guardadas correctamente.");
            }

            setShowModalFaltantes(false); // Cerramos el modal
            setNotasInputs({});           // Limpiamos los inputs
            setNotaMasiva("");            // Limpiamos el masivo
            setDataFaltantes([]);         // Vaciamos la lista de faltantes

        } catch (error) {
            console.error("Error en handleGuardarNotasFaltantes:", error);
            showError(error.message || "Error al procesar el guardado de notas.");
        } finally {
            setIsSavingNotas(false);
        }
    };

    // Variables derivadas para la Mesa de Control
    const vigenciasDisponiblesDestino = getVigenciasFiltradas();

    // Buscar el grado destino del primer estudiante PROMOVIDO para llenar el selector masivo
    const gradoDestinoPromovidos = simulacionData.find(est => est.dictamenSugerido === 'PROMOVIDO' && !est.esGraduando)?.gradoDestinoSugeridoId;
    const opcionesGrupoMasivo = gradoDestinoPromovidos ? grupos.filter(g => String(g.gradoId) === String(gradoDestinoPromovidos)) : [];

    // --- RENDER ---
    if (loadingCatalogs) return <div className="p-12 flex justify-center"><LoadingSpinner /></div>;

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Encabezado */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-2 border-b border-gray-300">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faUsersGear} className="text-blue-600 mr-3" />
                        Motor de Promoción Académica
                    </h1>
                    {vigenciaActiva && (
                        <div className="mt-2 md:mt-0 bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-md border border-blue-200">
                            Contexto Actual: Año {vigenciaActiva.anio}
                        </div>
                    )}
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-md shadow-sm">
                    <div className="flex">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-yellow-600 mt-1 mr-3" />
                        <div>
                            <h3 className="text-sm font-bold text-yellow-800">Advertencia Administrativa</h3>
                            <p className="text-xs text-yellow-700 mt-1">
                                Este módulo realiza cierres académicos permanentes. Sigue los pasos en orden. Primero debes generar las definitivas del grupo y, una vez ingresadas las nivelaciones, proceder con la promoción masiva.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filtros Contextuales */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-sm font-bold text-gray-700 uppercase mb-4 tracking-wider">1. Selección del Grupo a Evaluar</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Sede <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select name="sedeId" value={filters.sedeId} onChange={handleFilterChange} className="w-full border border-gray-300 rounded-lg p-2.5 pl-8 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option value="">-- Seleccione --</option>
                                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                                <FontAwesomeIcon icon={faSchool} className="absolute left-3 top-3 text-gray-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Grado <span className="text-red-500">*</span></label>
                            <select name="gradoId" value={filters.gradoId} onChange={handleFilterChange} disabled={!filters.sedeId} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100">
                                <option value="">-- Seleccione --</option>
                                {grados.map(g => <option key={g.id} value={g.id}>{g.nombre.replace(/_/g, " ")}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Grupo <span className="text-red-500">*</span></label>
                            <select name="grupoId" value={filters.grupoId} onChange={handleFilterChange} disabled={!filters.gradoId} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100">
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
                            className={`w-full py-3 px-4 rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-all text-white ${step1Completado
                                ? 'bg-amber-500 hover:bg-amber-600' // Color ámbar de advertencia si ya existe
                                : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {isProcessingStep1 ? <LoadingSpinner size="small" color="white" /> : <FontAwesomeIcon icon={faCogs} />}
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
                                <h3 className={`font-bold ${!step1Completado ? 'text-gray-500' : 'text-red-800'}`}>Promoción a Nueva Vigencia</h3>
                                <select
                                    name="vigenciaDestinoId"
                                    value={filters.vigenciaDestinoId}
                                    onChange={handleFilterChange}
                                    disabled={!step1Completado}
                                    className="w-full mt-2 border border-gray-300 rounded-md p-1.5 text-xs focus:ring-2 focus:ring-red-500 outline-none disabled:bg-gray-100"
                                >
                                    <option value="">-- Seleccione Año Destino --</option>
                                    {vigenciasDisponiblesDestino.map(v => <option key={v.id} value={v.id}>Año Lectivo {v.anio}</option>)}
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={handleSimularPaso2}
                            disabled={!filters.vigenciaDestinoId || isSimulatingStep2 || !step1Completado}
                            className="w-full py-3 px-4 rounded-lg font-bold text-sm flex justify-center items-center gap-2 transition-all text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:bg-gray-400"
                        >
                            {isSimulatingStep2 ? <LoadingSpinner size="small" color="white" /> : <FontAwesomeIcon icon={faTableList} />}
                            Simular Promoción
                        </button>
                    </div>

                </div>

                {/* ----------------------------------------------------- */}
                {/* MESA DE CONTROL (Aparece al Simular)               */}
                {/* ----------------------------------------------------- */}
                {simulacionData.length > 0 && (
                    <div className="mt-8 border rounded-xl overflow-hidden shadow-md bg-white border-blue-200 animate-fade-in">
                        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
                            <div>
                                <h3 className="text-white font-bold text-lg">Mesa de Control de Destinos</h3>
                                <p className="text-slate-300 text-sm mt-1">
                                    Verifique el dictamen y asigne el grupo en el cual quedará matriculado cada estudiante.
                                </p>
                            </div>
                        </div>

                        {/* BARRA DE ASIGNACIÓN MASIVA */}
                        {opcionesGrupoMasivo.length > 0 && (
                            <div className="bg-blue-50/80 px-6 py-3 border-b border-blue-100 flex justify-between items-center">
                                <div className="flex items-center gap-2 text-blue-800">
                                    <FontAwesomeIcon icon={faBolt} className="text-amber-500" />
                                    <span className="text-sm font-bold">Asignación Rápida:</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-blue-700">Asignar grupo a TODOS los PROMOVIDOS:</span>
                                    <select
                                        onChange={(e) => {
                                            handleAsignacionMasivaPromovidos(e.target.value);
                                            e.target.value = ""; // Resetear select
                                        }}
                                        className="border border-blue-300 rounded p-1.5 text-sm font-medium outline-none focus:border-blue-500 bg-white text-blue-900 shadow-sm"
                                    >
                                        <option value="">-- Seleccione el Grupo --</option>
                                        {opcionesGrupoMasivo.map(g => (
                                            <option key={g.id} value={g.id}>{getEtiquetaGrupoCompleto(g)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto max-h-[500px]">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-center font-bold text-gray-700 w-12">#</th>
                                        <th className="px-6 py-3 text-left font-bold text-gray-700">Estudiante</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-700">Áreas Perdidas</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-700">Dictamen Sugerido</th>
                                        <th className="px-6 py-3 text-left font-bold text-gray-700">Asignar Grupo Destino</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {simulacionData.map((est, index) => {
                                        const esPendiente = est.dictamenSugerido === 'PENDIENTE';
                                        const esReprobado = est.dictamenSugerido === 'REPROBADO';
                                        const esGraduando = est.esGraduando;

                                        const opcionesGrupo = grupos.filter(g => String(g.gradoId) === String(est.gradoDestinoSugeridoId));

                                        return (
                                            <tr key={est.matriculaId} className={esPendiente ? "bg-gray-50 opacity-60" : "hover:bg-blue-50/40 transition-colors"}>
                                                <td className="px-4 py-4 text-center font-bold text-gray-500">
                                                    {index + 1}
                                                </td>
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
                                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold inline-block w-28
                                                        ${esPendiente ? 'bg-gray-200 text-gray-700' :
                                                            esReprobado ? 'bg-red-100 text-red-700 border border-red-200' :
                                                                'bg-green-100 text-green-700 border border-green-200'}`}>
                                                        {est.dictamenSugerido}
                                                    </span>
                                                </td>

                                                <td className="px-6 py-4">
                                                    {esPendiente ? (
                                                        <span className="text-xs text-gray-500 italic bg-gray-100 px-3 py-1 rounded">Esperando nivelación</span>
                                                    ) : esGraduando ? (
                                                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-200">
                                                            Finaliza Académicamente (Egresado)
                                                        </span>
                                                    ) : (
                                                        <select
                                                            value={est.grupoDestinoSugeridoId || ""}
                                                            onChange={(e) => handleCambiarGrupoDestino(est.matriculaId, e.target.value)}
                                                            className={`border rounded-lg p-2 text-sm outline-none transition-all w-full
                                                                ${!est.grupoDestinoSugeridoId ? 'border-red-400 bg-red-50 focus:ring-2 focus:ring-red-200' : 'border-gray-300 focus:border-blue-500 bg-white'}`}
                                                        >
                                                            <option value="">-- Seleccionar Grupo --</option>
                                                            {opcionesGrupo.map(g => (
                                                                <option key={g.id} value={g.id}>
                                                                    {getEtiquetaGrupoCompleto(g)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-5 bg-gray-50 border-t flex justify-end">
                            <button
                                onClick={handleEjecutarPromocionFinal}
                                disabled={isExecutingFinal}
                                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-60"
                            >
                                {isExecutingFinal ? <LoadingSpinner size="small" color="white" /> : <FontAwesomeIcon icon={faCheckCircle} />}
                                {isExecutingFinal ? "Guardando Promoción..." : "Confirmar y Ejecutar Promoción"}
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
                                    No se puede cerrar el año. Los siguientes estudiantes no tienen calificación en los periodos indicados.
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
                                        <th className="px-4 py-3 text-center font-bold text-gray-600">Periodo Faltante</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-600">Asignar Calificación</th>
                                        <th className="px-4 py-3 text-center font-bold text-gray-600">Posponer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {dataFaltantes.map((falta, i) => {
                                        const isExcluido = excluidos.includes(falta.estudianteId);

                                        // ¿Es el primer registro de la tabla o cambió el estudiante respecto a la fila anterior?
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
                                                        type="number"
                                                        step="0.1"
                                                        min="1"
                                                        max="5"
                                                        placeholder="Ej: 1.0"
                                                        disabled={isSavingNotas || isExcluido} // Si está excluido, deshabilitamos el input
                                                        value={notasInputs[inputKey] || ''}
                                                        onChange={(e) => handleInputChange(falta.estudianteId, falta.asignaturaId, e.target.value)}
                                                        className={`w-20 border rounded p-1 text-center text-sm outline-none transition-colors ${isExcluido ? 'bg-gray-200 border-gray-300' : 'border-gray-300 focus:border-blue-500 bg-white'}`}
                                                    />
                                                </td>
                                                {/* NUEVA COLUMNA DE CHECKBOX */}
                                                <td className="px-4 py-3 text-center">
                                                    <label className="flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-red-600 hover:text-red-700">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 cursor-pointer accent-red-600"
                                                            checked={isExcluido}
                                                            onChange={() => handleToggleExcluir(falta.estudianteId)}
                                                            disabled={isSavingNotas}
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
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="5"
                                    placeholder="Ej: 1.0"
                                    value={notaMasiva}
                                    onChange={(e) => setNotaMasiva(e.target.value)}
                                    disabled={isSavingNotas}
                                    className="w-20 border border-gray-300 rounded p-1.5 text-center text-sm outline-none focus:border-blue-500"
                                />
                                <button
                                    onClick={handleAplicarMasivo}
                                    disabled={isSavingNotas}
                                    className="bg-gray-800 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-700 transition"
                                >
                                    Aplicar a todos
                                </button>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCerrarModalFaltantes}
                                    disabled={isSavingNotas}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-bold transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGuardarNotasFaltantes}
                                    disabled={isSavingNotas}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition flex items-center gap-2"
                                >
                                    {isSavingNotas ? "Guardando..." : "Guardar Notas y Continuar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromocionMasiva;