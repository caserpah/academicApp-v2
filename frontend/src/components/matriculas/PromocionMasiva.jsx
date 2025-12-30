import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faExchangeAlt, faCheckDouble, faArrowRight, faUsers, faArrowLeft
} from "@fortawesome/free-solid-svg-icons";

// Servicios
import { fetchInitialData as fetchSedesData } from "../../api/sedesService.js";
import { fetchGruposPorSede } from "../../api/gruposService.js";
import { listarMatriculas, crearMatriculaMasiva } from "../../api/matriculasService.js";
import { showSuccess, showError, showWarning } from "../../utils/notifications.js";

const PromocionMasiva = () => {
    // --- ESTADOS ---
    const [sedes, setSedes] = useState([]);

    // Origen (Desde donde)
    const [origen, setOrigen] = useState({ sedeId: "", grupoId: "", listaEstudiantes: [] });
    const [gruposOrigen, setGruposOrigen] = useState([]);

    // Destino (Hacia donde)
    const [destino, setDestino] = useState({ sedeId: "", grupoId: "" });
    const [gruposDestino, setGruposDestino] = useState([]);

    // Selección
    const [seleccionados, setSeleccionados] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);

    // --- EFECTOS ---

    // Cargar Sedes al inicio
    useEffect(() => {
        const cargarSedes = async () => {
            try {
                const data = await fetchSedesData();
                if (data?.sedes) setSedes(data.sedes);
            } catch (error) {
                console.error("Error cargando sedes", error);
                showError("Error al cargar listado de sedes.");
            }
        };
        cargarSedes();
    }, []);

    // Cargar Grupos Origen cuando cambia Sede Origen
    useEffect(() => {
        if (!origen.sedeId) { setGruposOrigen([]); return; }
        fetchGruposPorSede(origen.sedeId).then(setGruposOrigen).catch(console.error);
    }, [origen.sedeId]);

    // Cargar Grupos Destino cuando cambia Sede Destino
    useEffect(() => {
        if (!destino.sedeId) { setGruposDestino([]); return; }
        fetchGruposPorSede(destino.sedeId).then(setGruposDestino).catch(console.error);
    }, [destino.sedeId]);

    // Buscar Estudiantes cuando se selecciona Grupo Origen
    useEffect(() => {
        const cargarEstudiantes = async () => {
            if (!origen.grupoId) {
                setOrigen(prev => ({ ...prev, listaEstudiantes: [] }));
                return;
            }

            setLoadingEstudiantes(true);
            try {
                // Buscamos matrículas del grupo origen
                const respuesta = await listarMatriculas({
                    grupoId: origen.grupoId,
                    limit: 100 // Traemos un lote grande
                });

                const items = respuesta.items || [];
                setOrigen(prev => ({ ...prev, listaEstudiantes: items }));
                setSeleccionados([]); // Reseteamos selección al cambiar grupo
            } catch (error) {
                console.error(error);
                showError("Error al cargar estudiantes del grupo origen.");
            } finally {
                setLoadingEstudiantes(false);
            }
        };
        cargarEstudiantes();
    }, [origen.grupoId]);


    // --- HANDLERS ---

    const handleCheck = (estudianteId) => {
        setSeleccionados(prev => {
            if (prev.includes(estudianteId)) {
                return prev.filter(id => id !== estudianteId);
            } else {
                return [...prev, estudianteId];
            }
        });
    };

    const handleSelectAll = () => {
        if (seleccionados.length === origen.listaEstudiantes.length) {
            setSeleccionados([]); // Desmarcar todos
        } else {
            // Marcar todos los IDs de estudiantes disponibles
            const todosLosIds = origen.listaEstudiantes.map(m => m.estudiante.id);
            setSeleccionados(todosLosIds);
        }
    };

    const handleSubmit = async () => {
        if (seleccionados.length === 0) return showWarning("Seleccione al menos un estudiante.");
        if (!destino.grupoId) return showWarning("Seleccione el grupo de destino.");

        if (!window.confirm(`¿Está seguro de promover/matricular a ${seleccionados.length} estudiantes?`)) return;

        setLoading(true);
        try {
            const payload = {
                estudiantesIds: seleccionados,
                grupoDestinoId: destino.grupoId,
                sedeId: destino.sedeId
            };

            const respuesta = await crearMatriculaMasiva(payload);
            showSuccess(respuesta.mensaje || `Proceso exitoso. ${seleccionados.length} estudiantes procesados.`);

            // Limpiar selección y recargar lista origen
            setSeleccionados([]);

            // Recargar estudiantes origen para reflejar los cambios (si se movieron, quizás ya no deban salir aquí dependiendo de la lógica, o simplemente refrescar estado)
            const reload = await listarMatriculas({ grupoId: origen.grupoId, limit: 100 });
            setOrigen(prev => ({ ...prev, listaEstudiantes: reload.items || [] }));

        } catch (error) {
            showError(error.message || "Error en el proceso masivo.");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---
    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* HEADER (Estilo idéntico a Matriculas.jsx) */}
                <div className="flex justify-between items-center border-b pb-4">
                    <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
                        <FontAwesomeIcon icon={faUsers} className="w-6 h-6 mr-3 text-[#2c3e50]" />
                        Promoción y Matrícula Masiva
                    </h1>
                    <Link to="/matriculas" className="text-sm text-blue-600 hover:text-blue-700 flex items-center font-medium">
                        <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                        Volver al listado
                    </Link>
                </div>

                {/* CONTENIDO PRINCIPAL (Tarjeta Blanca) */}
                <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">

                    {/* SELECCIÓN DE GRUPOS */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center mb-8">

                        {/* COLUMNA ORIGEN */}
                        <div className="md:col-span-5 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-700 border-b pb-2 mb-2">📂 Origen (Actual)</h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sede</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                                    value={origen.sedeId}
                                    onChange={e => setOrigen({ ...origen, sedeId: e.target.value, grupoId: "" })}
                                >
                                    <option value="">Seleccione Sede...</option>
                                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grupo</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                                    value={origen.grupoId}
                                    onChange={e => setOrigen({ ...origen, grupoId: e.target.value })}
                                    disabled={!origen.sedeId}
                                >
                                    <option value="">Seleccione Grupo...</option>
                                    {gruposOrigen.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.grado ? `${g.grado.nombre} - ` : ""} {g.nombre} ({g.jornada})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* FLECHA */}
                        <div className="md:col-span-2 flex justify-center">
                            <div className="text-gray-300">
                                <FontAwesomeIcon icon={faArrowRight} className="text-2xl md:rotate-0 rotate-90" />
                            </div>
                        </div>

                        {/* COLUMNA DESTINO */}
                        <div className="md:col-span-5 space-y-4 p-4  bg-gray-50 rounded-lg border border-gray-200">
                            <h3 className="font-semibold text-gray-700 border-b pb-2 mb-2">📂 Destino (Nuevo)</h3>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sede</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                                    value={destino.sedeId}
                                    onChange={e => setDestino({ ...destino, sedeId: e.target.value, grupoId: "" })}
                                >
                                    <option value="">Seleccione Sede...</option>
                                    {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grupo</label>
                                <select
                                    className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                                    value={destino.grupoId}
                                    onChange={e => setDestino({ ...destino, grupoId: e.target.value })}
                                    disabled={!destino.sedeId}
                                >
                                    <option value="">Seleccione Grupo...</option>
                                    {gruposDestino.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.grado ? `${g.grado.nombre} - ` : ""} {g.nombre} ({g.jornada})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* LISTA DE ESTUDIANTES */}
                    <div className="border-t border-[#d8d5d5] pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-700">
                                Estudiantes disponibles <span className="text-sm text-gray-500">({origen.listaEstudiantes.length})</span>
                            </h3>
                            {origen.listaEstudiantes.length > 0 && (
                                <button
                                    onClick={handleSelectAll}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                                >
                                    <FontAwesomeIcon icon={faCheckDouble} className="mr-2" />
                                    {seleccionados.length === origen.listaEstudiantes.length ? "Desmarcar Todos" : "Seleccionar Todos"}
                                </button>
                            )}
                        </div>

                        <div className="border  border-gray-300 rounded-lg overflow-hidden max-h-[450px] overflow-y-auto">
                            {loadingEstudiantes ? (
                                <div className="p-8 text-center text-gray-500">
                                    <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full mb-2"></div>
                                    <p>Cargando estudiantes...</p>
                                </div>
                            ) : origen.listaEstudiantes.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 italic bg-gray-50">
                                    Seleccione Sede y Grupo de Origen para cargar el listado.
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-center w-12">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    onChange={handleSelectAll}
                                                    checked={origen.listaEstudiantes.length > 0 && seleccionados.length === origen.listaEstudiantes.length}
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estudiante</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {origen.listaEstudiantes.map((mat) => (
                                            <tr
                                                key={mat.estudiante.id}
                                                className={`hover:bg-blue-50 cursor-pointer transition ${seleccionados.includes(mat.estudiante.id) ? 'bg-blue-50' : ''}`}
                                                onClick={() => handleCheck(mat.estudiante.id)}
                                            >
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={seleccionados.includes(mat.estudiante.id)}
                                                        onChange={() => { }}
                                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                                                    {mat.estudiante.documento}
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {mat.estudiante.primerApellido} {mat.estudiante.segundoApellido} {mat.estudiante.primerNombre}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                        {mat.estado}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* BOTÓN DE ACCIÓN */}
                    <div className="pt-6 mt-6 border-t border-[#eee] flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || seleccionados.length === 0 || !destino.grupoId}
                            className={`flex items-center px-6 py-2.5 rounded-lg shadow-sm text-white font-medium transition
                                ${loading || seleccionados.length === 0 || !destino.grupoId
                                    ? "bg-gray-300 cursor-not-allowed text-gray-500"
                                    : "bg-green-600 hover:bg-green-700 active:scale-95"
                                }
                            `}
                        >
                            {loading ? "Procesando..." : (
                                <>
                                    <FontAwesomeIcon icon={faExchangeAlt} className="mr-2" />
                                    Procesar ({seleccionados.length})
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PromocionMasiva;