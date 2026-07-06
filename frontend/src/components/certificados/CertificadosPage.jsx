import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faFileContract, faUserGraduate, faDownload, faSpinner, faUsers, faFileAlt } from "@fortawesome/free-solid-svg-icons";

import { buscarEstudianteConMatriculas, descargarCertificadoMatricula, descargarCertificadoNotas } from "../../api/certificadosService.js";
import { showError, showWarning } from "../../utils/notifications.js";
import Swal from "sweetalert2";

const CertificadosPage = () => {
    const [busqueda, setBusqueda] = useState("");
    const [resultados, setResultados] = useState([]); // Array de posibles coincidencias
    const [estudiante, setEstudiante] = useState(null); // Estudiante finalmente seleccionado
    const [isSearching, setIsSearching] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Estado para controlar que documento se va a generar (MATRICULA o NOTAS)
    const [tipoDocumento, setTipoDocumento] = useState("MATRICULA");

    // Estado para controlar qué año de matrícula se ha seleccionado
    const [vigenciaSeleccionada, setVigenciaSeleccionada] = useState("");

    // Extraemos los años de vigencia disponibles del estudiante seleccionado
    const vigenciasDisponibles = estudiante?.matriculas
        ? [...new Set(estudiante.matriculas.map(m => m.anio).filter(Boolean))].sort((a, b) => b - a)
        : [];

    // Filtramos las matrículas del estudiante según el año de vigencia seleccionado
    const matriculasDelAnio = estudiante?.matriculas?.filter(
        m => m.anio === Number(vigenciaSeleccionada)
    ) || [];

    // Selector dinámico de periodos según el grado del estudiante y la matrícula seleccionada
    const getOpcionesPeriodo = () => {
        const mat = estudiante?.matriculas?.find(m => String(m.id) === String(config.matriculaId));
        if (!mat || !mat.grado) return [];

        const grado = mat.grado.toUpperCase();

        // Evaluamos PRIMERO el Ciclo VI para evitar falsos positivos con el Ciclo V
        if (grado.includes('CICLO_VI') || grado.includes('CICLO VI')) {
            return [
                { value: "3", label: "Tercer Periodo" },
                { value: "4", label: "Cuarto Periodo" },
                { value: "5", label: "Informe Final (Definitivas)", isFinal: true }
            ];
        }
        // Evaluamos el Ciclo V después
        else if (grado.includes('CICLO_V') || grado.includes('CICLO V')) {
            return [
                { value: "1", label: "Primer Periodo" },
                { value: "2", label: "Segundo Periodo" },
                { value: "3", label: "Informe Final (Definitivas)", isFinal: true }
            ];
        }
        // Modalidad Tradicional
        else {
            return [
                { value: "1", label: "Primer Periodo" },
                { value: "2", label: "Segundo Periodo" },
                { value: "3", label: "Tercer Periodo" },
                { value: "4", label: "Cuarto Periodo" },
                { value: "5", label: "Informe Final (Definitivas)", isFinal: true }
            ];
        }
    };

    // Opciones del Certificado
    const [config, setConfig] = useState({
        matriculaId: "",
        // Opciones para Matrícula
        iniciaronClases: true,
        meses: "",
        comportamiento: "",
        // Opciones para Notas
        periodo: ""
    });

    const handleBuscar = async (e) => {
        e.preventDefault();
        if (!busqueda.trim()) return;

        try {
            setIsSearching(true);
            setEstudiante(null);
            setResultados([]);
            setConfig(prev => ({ ...prev, matriculaId: "", meses: "", comportamiento: "", periodo: "" }));

            // Llamada real al backend
            const data = await buscarEstudianteConMatriculas(busqueda);

            if (data && data.length > 0) {
                setResultados(data);

                // Si solo encontró a 1 persona, la seleccionamos automáticamente
                if (data.length === 1) {
                    seleccionarEstudiante(data[0]);
                }
            } else {
                showWarning("No se encontraron registros.");
            }
        } catch (error) {
            showWarning(error.message || "No se encontró ningún estudiante.");
        } finally {
            setIsSearching(false);
        }
    };

    const seleccionarEstudiante = (est) => {
        setEstudiante(est);
        if (est.matriculas?.length > 0) {
            setConfig(prev => ({ ...prev, matriculaId: est.matriculas[0].id }));
        } else {
            showWarning("El estudiante seleccionado no tiene matrículas registradas.");
        }
    };

    // Función para cancelar la selección actual y volver a la lista
    const volverALaLista = () => {
        setEstudiante(null);
        setConfig(prev => ({ ...prev, matriculaId: "" }));
    };

    const handleGenerar = async () => {
        if (!config.matriculaId) {
            showWarning("Debe seleccionar un año de matrícula.");
            return;
        }

        try {
            setIsGenerating(true);

            // Lógica para decidir qué certificado generar
            if (tipoDocumento === "MATRICULA") {
                await descargarCertificadoMatricula(config);
            } else if (tipoDocumento === "NOTAS") {
                if (!config.periodo) {
                    showWarning("Seleccione el periodo a certificar.");
                    setIsGenerating(false);
                    return;
                }
                await descargarCertificadoNotas({
                    matriculaId: config.matriculaId,
                    periodo: config.periodo
                });
            }

            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Certificado generado exitosamente.',
                timer: 3000, // <-- Se cierra solo después de 3 segundos
                showConfirmButton: false
            });
        } catch (error) {
            if (error.message.includes("no tiene calificaciones") || error.status === 404) {
                showWarning(error.message);
            } else {
                showError(error.message || "Error al generar el documento.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-full bg-[#f7f7fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Header */}
                <div className="pb-4 border-b border-gray-200">
                    <h1 className="text-2xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faFileContract} className="text-blue-600 mr-3" />
                        Emisión de Certificados
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Busque un estudiante para generar constancias y certificados históricos.</p>
                </div>

                {/* Buscador */}
                <form onSubmit={handleBuscar} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1 ml-1">Buscar por documento, nombres o apellidos</label>
                        <div className="relative">
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 text-sm outline-none focus:border-blue-500 transition-colors"
                            />
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-3.5 text-gray-400" />
                        </div>
                    </div>
                    <button type="submit" disabled={isSearching || !busqueda.trim()} className="px-6 py-2.5 bg-blue-800 hover:bg-blue-900 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2 h-[42px] disabled:bg-gray-400">
                        {isSearching ? <FontAwesomeIcon icon={faSpinner} spin /> : "Buscar"}
                    </button>
                </form>

                {/* Selector de Resultados (Visible si hay múltiples coincidencias y aún no se elige a uno) */}
                {resultados.length > 1 && !estudiante && (
                    <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 animate-fade-in-down shadow-sm">
                        <h3 className="text-sm font-bold text-yellow-800 mb-3 flex items-center gap-2">
                            <FontAwesomeIcon icon={faUsers} /> Se encontraron {resultados.length} coincidencias
                        </h3>
                        <p className="text-xs text-yellow-700 mb-3">Por favor, seleccione el estudiante correcto de la lista:</p>

                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                            {resultados.map(est => (
                                <button
                                    key={est.id}
                                    onClick={() => seleccionarEstudiante(est)}
                                    className="w-full flex justify-between items-center bg-white p-3 rounded-lg border border-yellow-300 hover:bg-yellow-100 hover:border-yellow-400 transition-all text-left shadow-sm"
                                >
                                    <span className="font-bold text-slate-700 text-sm">{est.nombreCompleto}</span>
                                    <span className="text-xs text-slate-500 font-mono bg-gray-100 px-2 py-1 rounded">Doc: {est.documento}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Tarjeta de Configuración (Solo visible si hay un estudiante seleccionado) */}
                {estudiante && estudiante.matriculas && (
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in-up transition-all">

                        {/* Info Estudiante */}
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 text-xl shrink-0">
                                    <FontAwesomeIcon icon={faUserGraduate} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-900">{estudiante.nombreCompleto}</h3>
                                    <p className="text-xs text-blue-700">Documento: {estudiante.documento}</p>
                                </div>
                            </div>

                            {/* Botón para regresar a la lista si habían varios */}
                            {resultados.length > 1 && (
                                <button onClick={volverALaLista} className="text-xs font-bold text-blue-600 hover:text-blue-800 underline">
                                    Cambiar estudiante
                                </button>
                            )}
                        </div>

                        <div className="space-y-6">
                            {/* Fila: Tipo de Documento, Año Lectivo y Grado */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-700 mb-1 ml-1 flex items-center gap-1.5">
                                        <FontAwesomeIcon icon={faFileAlt} className="text-gray-400" /> Tipo de Documento
                                    </label>
                                    <select
                                        value={tipoDocumento}
                                        onChange={(e) => setTipoDocumento(e.target.value)}
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
                                            setVigenciaSeleccionada(e.target.value);
                                            setConfig({ ...config, matriculaId: "", periodo: "" });
                                        }}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                                    >
                                        <option value="">-- Seleccione el año --</option>
                                        {vigenciasDisponibles.map(anio => (
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
                                                {mat.grado.replace(/_/g, ' ')} - Sede {mat.sede}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* Opciones Específicas Dinámicas */}
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
                                                        type="number" min="1" max="11"
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
                                    <div className="animate-fade-in mt-4">
                                        <h4 className="text-sm font-bold text-gray-700 mb-3">Opciones del Certificado</h4>
                                        <label className="block text-xs text-gray-500 mb-1">Periodo a Certificar <span className="text-red-500">*</span></label>
                                        <select
                                            value={config.periodo}
                                            onChange={(e) => setConfig({ ...config, periodo: e.target.value })}
                                            disabled={!config.matriculaId}
                                            className="w-full md:w-1/3 border border-gray-300 rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-white disabled:bg-gray-100"
                                        >
                                            <option value="">-- Seleccione --</option>
                                            {getOpcionesPeriodo().map(opt => (
                                                <option key={opt.value} value={opt.value} className={opt.isFinal ? "font-bold text-blue-700" : ""}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botón Generar */}
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleGenerar}
                                disabled={isGenerating || !config.matriculaId || (tipoDocumento === "NOTAS" && !config.periodo)}
                                className={`px-5 py-2 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 shadow-sm ${(!config.matriculaId) ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 active:scale-95'}`}
                            >
                                {isGenerating ? <><FontAwesomeIcon icon={faSpinner} spin /> Generando...</> : <><FontAwesomeIcon icon={faDownload} /> Descargar Documento</>}
                            </button>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default CertificadosPage;