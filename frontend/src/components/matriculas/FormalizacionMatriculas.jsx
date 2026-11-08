import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExchangeAlt, faSearch, faSave, faLock } from "@fortawesome/free-solid-svg-icons";
import { consultarEvaluadosFormalizacion, ejecutarFormalizacionMasiva } from "../../api/matriculasService.js";
import { fetchInitialData as fetchSedesData } from "../../api/sedesService.js";
import { fetchVigencias } from "../../api/vigenciasService.js";
import { fetchGruposPorSede } from "../../api/gruposService.js";
import { showSuccess, showWarning, showError } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";

const FormalizacionMatriculas = () => {
    const [listas, setListas] = useState({ sedes: [], vigencias: [], gruposOrigen: [], gruposDestino: [] });

    const [origen, setOrigen] = useState({ vigenciaId: "", sedeId: "", grupoId: "" });
    const [destino, setDestino] = useState({ vigenciaId: "", sedeId: "", grupoId: "" });
    const [vigenciaActiva, setVigenciaActiva] = useState(null);

    const [estudiantesPromovidos, setEstudiantesPromovidos] = useState([]);
    const [seleccionados, setSeleccionados] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 1. CARGA DE MAESTROS
    useEffect(() => {
        const cargarMaestros = async () => {
            try {
                const [dataSedes, dataVigencias] = await Promise.all([fetchSedesData(), fetchVigencias()]);
                const vigenciasList = dataVigencias || [];
                setListas(prev => ({ ...prev, sedes: dataSedes?.sedes || [], vigencias: vigenciasList }));

                // Buscar la vigencia activa
                const activa = vigenciasList.find(v => v.activa === true);
                if (activa) {
                    setVigenciaActiva(activa);
                    setOrigen(prev => ({ ...prev, vigenciaId: activa.id })); // Pre-selecciona el origen
                }
            } catch {
                showError("Error al cargar datos maestros.");
            }
        };
        cargarMaestros();
    }, []);

    // 2. CARGA DINÁMICA DE GRUPOS
    useEffect(() => {
        const cargarGrupos = async () => {
            if (!origen.sedeId || !origen.vigenciaId) return;
            const grupos = await fetchGruposPorSede(origen.sedeId, origen.vigenciaId);
            setListas(prev => ({ ...prev, gruposOrigen: grupos || [] }));
        };
        cargarGrupos();
    }, [origen.sedeId, origen.vigenciaId]);

    useEffect(() => {
        const cargarGrupos = async () => {
            if (!destino.sedeId || !destino.vigenciaId) return;
            const grupos = await fetchGruposPorSede(destino.sedeId, destino.vigenciaId);
            setListas(prev => ({ ...prev, gruposDestino: grupos || [] }));
        };
        cargarGrupos();
    }, [destino.sedeId, destino.vigenciaId]);


    // ==========================================
    // LÓGICA Y REGLAS DE NEGOCIO
    // ==========================================

    // Helper para formatear visualmente el selector de grupos
    const formatGrupo = (g) => {
        if (!g) return "";
        const grado = g.grado?.nombre ? g.grado.nombre.replace(/_/g, " ") : "Sin Grado";
        const jornada = g.jornada ? g.jornada.replace("MANANA", "MAÑANA") : "";
        return `${grado} - ${g.nombre} | ${jornada}`;
    };

    // Manejador del Grupo Origen (Aplica regla Ciclo V vs Año Siguiente)
    const handleOrigenGrupoChange = (e) => {
        const grupoId = e.target.value;
        setOrigen(prev => ({ ...prev, grupoId }));

        // Limpiamos los estudiantes si cambian de grupo
        setEstudiantesPromovidos([]);
        setSeleccionados([]);

        if (!grupoId || !origen.vigenciaId) {
            setDestino(prev => ({ ...prev, vigenciaId: "" }));
            return;
        }

        const grupoSel = listas.gruposOrigen.find(g => Number(g.id) === Number(grupoId));
        const nombreGrado = grupoSel?.grado?.nombre?.toUpperCase() || "";
        const esCicloV = nombreGrado.includes("CICLO_V") || nombreGrado.includes("CICLO V");

        const vigenciaOrigenObj = listas.vigencias.find(v => Number(v.id) === Number(origen.vigenciaId));

        if (vigenciaOrigenObj) {
            // Regla: N+1, excepto Ciclo V que salta a Ciclo VI en el mismo año.
            const anioDestinoEsperado = esCicloV ? vigenciaOrigenObj.anio : vigenciaOrigenObj.anio + 1;
            const vigenciaDestObj = listas.vigencias.find(v => v.anio === anioDestinoEsperado);

            if (vigenciaDestObj) {
                setDestino(prev => ({ ...prev, vigenciaId: vigenciaDestObj.id, grupoId: "" }));
            } else {
                showWarning(`⚠️ El año lectivo ${anioDestinoEsperado} no está configurado en el sistema. Debe crearlo primero en Vigencias.`);
                setDestino(prev => ({ ...prev, vigenciaId: "", grupoId: "" }));
            }
        }
    };


    const handleBuscarOrigen = async () => {
        if (!origen.vigenciaId || !origen.sedeId || !origen.grupoId) {
            return showWarning("Seleccione la Vigencia, Sede y Grupo de Origen.");
        }

        // Requerido para que el backend pueda excluir a los ya matriculados
        if (!destino.vigenciaId) {
            return showWarning("Aún no se ha calculado el Año Destino. Vuelva a seleccionar el grupo de origen.");
        }

        setIsSearching(true);
        try {
            const data = await consultarEvaluadosFormalizacion(origen.grupoId, origen.vigenciaId, destino.vigenciaId);

            if (data.length === 0) {
                showWarning("No se encontraron estudiantes con dictamen PROMOVIDO o REPROBADO en este grupo.");
            }

            setEstudiantesPromovidos(data);
            setSeleccionados([]); // Limpiamos selecciones previas si las hubiera
        } catch (error) {
            showError(error.message || "Error al buscar estudiantes.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleToggleSeleccion = (id) => {
        setSeleccionados(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleSeleccionarTodos = () => {
        if (seleccionados.length === estudiantesPromovidos.length) setSeleccionados([]);
        else setSeleccionados(estudiantesPromovidos.map(e => e.id));
    };

    const handleSeleccionarPorDictamen = (dictamen) => {
        const ids = estudiantesPromovidos
            .filter(e => e.dictamen === dictamen)
            .map(e => e.id);
        setSeleccionados(ids);
    };

    const handleFormalizar = async () => {
        if (!destino.vigenciaId || !destino.sedeId || !destino.grupoId) {
            return showWarning("Complete todos los campos del Destino.");
        }
        if (seleccionados.length === 0) {
            return showWarning("Seleccione al menos un estudiante.");
        }

        setIsSaving(true);
        try {
            // Construir el payload con los estudiantes seleccionados
            const estudiantesPayload = estudiantesPromovidos
                .filter(est => seleccionados.includes(est.id))
                .map(est => ({
                    estudianteId: est.estudianteId,
                    dictamen: est.dictamen
                }));

            const payload = {
                destino: {
                    vigenciaId: destino.vigenciaId,
                    sedeId: destino.sedeId,
                    grupoId: destino.grupoId
                },
                estudiantes: estudiantesPayload
            };

            // 2. Enviar al backend
            const respuesta = await ejecutarFormalizacionMasiva(payload);

            showSuccess(respuesta.mensaje || "Matrículas formalizadas exitosamente.");

            // Limpiar selección y recargar la tabla de origen
            setEstudiantesPromovidos(prev => prev.filter(est => !seleccionados.includes(est.id)));
            setSeleccionados([]);
        } catch (error) {
            showError(error.message || "Error al formalizar.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row items-center justify-between pb-4 border-b border-gray-200">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faExchangeAlt} className="w-6 h-6 mr-3 text-blue-600" />
                        Formalización Masiva de Matrículas
                    </h1>

                    {/* Badge de Año Lectivo Activo */}
                    {vigenciaActiva && (
                        <div className="mt-3 md:mt-0 text-sm font-bold text-blue-700 bg-blue-100 px-4 py-1.5 rounded-full border border-blue-200 shadow-sm flex items-center">
                            Año Lectivo: <span className="text-blue-900 ml-1">{vigenciaActiva.anio}</span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* PANEL ORIGEN */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                        <h2 className="font-bold text-gray-700 mb-4">1. Origen (Año Finalizado)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-3 mb-4">

                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    value={origen.vigenciaId}
                                    onChange={e => {
                                        setOrigen({ ...origen, vigenciaId: e.target.value, grupoId: "" });
                                        setDestino(prev => ({ ...prev, vigenciaId: "" }));

                                        // Limpiamos la tabla de estudiantes y selecciones si cambia la vigencia
                                        setEstudiantesPromovidos([]);
                                        setSeleccionados([]);
                                    }}
                                    className="border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="">Año Lectivo...</option>
                                    {listas.vigencias.map(v => <option key={v.id} value={v.id}>{v.anio}</option>)}
                                </select>
                                <select
                                    value={origen.sedeId}
                                    onChange={e => {
                                        setOrigen({...origen, sedeId: e.target.value, grupoId: ""});
                                        // Limpiamos la tabla de estudiantes y selecciones si cambia la sede
                                        setEstudiantesPromovidos([]);
                                        setSeleccionados([]);
                                    }}
                                    className="border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="">Sede Origen...</option>
                                    {listas.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>

                            <select
                                value={origen.grupoId}
                                onChange={handleOrigenGrupoChange}
                                className="border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none w-full font-medium text-gray-700"
                            >
                                <option value="">Seleccione Grupo de Origen...</option>
                                {listas.gruposOrigen.map(g => <option key={g.id} value={g.id}>{formatGrupo(g)}</option>)}
                            </select>

                        </div>
                        <button onClick={handleBuscarOrigen} disabled={isSearching} className="w-full bg-blue-50 text-blue-700 font-semibold py-2 rounded-lg border border-blue-200 hover:bg-blue-100 transition flex items-center justify-center">
                            {isSearching ? <LoadingSpinner size="small" /> : <><FontAwesomeIcon icon={faSearch} className="mr-2" /> Buscar Estudiantes Evaluados</>}
                        </button>
                    </div>

                    {/* PANEL DESTINO */}
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                        <h2 className="font-bold text-gray-700 mb-4">2. Destino (Nueva Matrícula)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-3 mb-4">

                            <div className="grid grid-cols-2 gap-3">
                                <div className="relative">
                                    <select
                                        value={destino.vigenciaId}
                                        disabled
                                        title="El sistema calcula el año automáticamente según el grupo de origen"
                                        className="border border-gray-300 rounded p-2 text-sm bg-gray-100 text-gray-600 outline-none cursor-not-allowed w-full appearance-none font-bold"
                                    >
                                        <option value="">Año Calculado...</option>
                                        {listas.vigencias.map(v => <option key={v.id} value={v.id}>{v.anio}</option>)}
                                    </select>
                                    <FontAwesomeIcon icon={faLock} className="absolute right-3 top-2.5 text-gray-400 text-sm" />
                                </div>
                                <select
                                    value={destino.sedeId}
                                    onChange={e => setDestino({ ...destino, sedeId: e.target.value, grupoId: "" })}
                                    className="border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-blue-500 outline-none"
                                >
                                    <option value="">Sede Destino...</option>
                                    {listas.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>

                            <select
                                value={destino.grupoId}
                                onChange={e => setDestino({ ...destino, grupoId: e.target.value })}
                                className="border border-gray-300 rounded p-2 text-sm focus:ring-green-500 focus:border-blue-500 outline-none w-full font-medium text-gray-700"
                            >
                                <option value="">Seleccione Grupo de Destino...</option>
                                {listas.gruposDestino.map(g => <option key={g.id} value={g.id}>{formatGrupo(g)}</option>)}
                            </select>

                        </div>
                    </div>
                </div>

                {/* TABLA DE ESTUDIANTES */}
                {estudiantesPromovidos.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fade-in">
                        <div className="p-4 bg-gray-50 flex flex-col md:flex-row justify-between items-center border-b border-gray-200 gap-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <h3 className="font-semibold text-gray-700">
                                    3. Seleccionar Estudiantes ({seleccionados.length} de {estudiantesPromovidos.length})
                                </h3>

                                {/* BOTONES DE SELECCIÓN RÁPIDA */}
                                <div className="flex items-center bg-gray-200 p-1 rounded-lg">
                                    <button
                                        onClick={() => handleSeleccionarPorDictamen('PROMOVIDO')}
                                        className="px-3 py-1 text-xs font-semibold rounded text-purple-700 hover:bg-white hover:shadow-sm transition-all"
                                        title="Seleccionar únicamente a los promovidos"
                                    >
                                        Solo Promovidos
                                    </button>
                                    <button
                                        onClick={() => handleSeleccionarPorDictamen('REPROBADO')}
                                        className="px-3 py-1 text-xs font-semibold rounded text-red-600 hover:bg-white hover:shadow-sm transition-all ml-1"
                                        title="Seleccionar únicamente a los reprobados"
                                    >
                                        Solo Reprobados
                                    </button>
                                </div>
                            </div>

                            <button onClick={handleFormalizar} disabled={isSaving || seleccionados.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium transition flex items-center shadow-sm disabled:opacity-50">
                                {isSaving ? <LoadingSpinner size="small" color="white" /> : <><FontAwesomeIcon icon={faSave} className="mr-2" /> Formalizar Matrículas</>}
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left">
                                            <input type="checkbox" onChange={handleSeleccionarTodos} checked={seleccionados.length === estudiantesPromovidos.length && estudiantesPromovidos.length > 0} className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Documento</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Estudiante</th>
                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Dictamen Cierre</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {estudiantesPromovidos.map(est => (
                                        <tr key={est.id} className="hover:bg-blue-50 transition cursor-pointer" onClick={() => handleToggleSeleccion(est.id)}>
                                            <td className="px-4 py-3">
                                                <input type="checkbox" checked={seleccionados.includes(est.id)} readOnly className="w-4 h-4 text-blue-600 rounded cursor-pointer" />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600 font-mono">{est.documento}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-800">{est.nombreCompleto}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${est.dictamen === 'PROMOVIDO' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'}`}>
                                                    {est.dictamen}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* OVERLAY DE CARGA */}
            {isSaving && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/70 backdrop-blur-sm animate-fade-in">
                    <LoadingSpinner size="large" color="white" fullContainer={false} />
                    <h2 className="text-white mt-4 text-xl font-bold tracking-wide">Formalizando matrículas...</h2>
                </div>
            )}
        </div>
    );
};

export default FormalizacionMatriculas;