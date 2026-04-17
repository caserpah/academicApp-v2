import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf, faPrint, faSpinner, faFilter, faSearch, faDownload, faTimes } from "@fortawesome/free-solid-svg-icons";
import { fetchBoletinesCatalogs, fetchEstudiantesPorGrupo, generarBoletinesPDF, fetchAuditoriaBoletines } from "../../api/boletinesService.js";
import { fetchGruposFiltrados } from "../../api/cargasService.js"; // Reutilizamos tu helper existente
import { showError, showWarning } from "../../utils/notifications.js";
import { formatearJornada } from "../../utils/formatters.js"; // Importamos el formateador de jornadas
import Swal from "sweetalert2";

const GenerarBoletines = () => {
    // --- ESTADOS DE DATOS ---
    const [catalogos, setCatalogos] = useState({
        sedes: [], grados: [], grupos: [], estudiantes: []
    });

    const [formData, setFormData] = useState({
        sedeId: "",
        gradoId: "",
        grupoId: "",
        estudianteId: "", // Vacío = Todo el grupo
        periodoActual: "",
        tipoBoletin: ""
    });

    const [loading, setLoading] = useState(false);

    // Estado para auditoría de notas faltantes
    const [reporteFaltantes, setReporteFaltantes] = useState(null);
    const [isAuditing, setIsAuditing] = useState(false);

    // Variable para que todo el componente (incluyendo el HTML) sepa si es preescolar
    const grupoActual = catalogos.grupos.find(g => g.id === Number(formData.grupoId));
    const esPreescolar = grupoActual?.grado?.nivelAcademico === 'PREESCOLAR';

    // Clases CSS extraídas de tu código
    const inputClasses = "w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:text-gray-500";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    // --- CARGA INICIAL ---
    useEffect(() => {
        const init = async () => {
            try {
                const cats = await fetchBoletinesCatalogs();
                setCatalogos(prev => ({ ...prev, sedes: cats.sedes, grados: cats.grados }));
            } catch (err) {
                console.error("Error en init de GenerarBoletines", err);
                showError("Error al cargar sedes y grados.");
            }
        };
        init();
    }, []);

    // --- EFECTO: CARGAR GRUPOS (Depende de Sede y Grado) ---
    useEffect(() => {
        const cargarGrupos = async () => {
            if (!formData.sedeId || !formData.gradoId) {
                setCatalogos(prev => ({ ...prev, grupos: [], estudiantes: [] }));
                return;
            }
            const grupos = await fetchGruposFiltrados(formData.sedeId, formData.gradoId);
            setCatalogos(prev => ({ ...prev, grupos }));
        };
        cargarGrupos();
    }, [formData.sedeId, formData.gradoId]);

    // --- EFECTO: CARGAR ESTUDIANTES (Depende del Grupo) ---
    useEffect(() => {
        const cargarEstudiantes = async () => {
            if (!formData.grupoId) {
                setCatalogos(prev => ({ ...prev, estudiantes: [] }));
                return;
            }
            const estudiantes = await fetchEstudiantesPorGrupo(formData.grupoId);
            setCatalogos(prev => ({ ...prev, estudiantes }));
        };
        cargarEstudiantes();
    }, [formData.grupoId]);


    // --- HANDLERS ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Reseteos en cascada
        if (name === "sedeId" || name === "gradoId") {
            setFormData(prev => ({ ...prev, grupoId: "", estudianteId: "" }));
        }
        if (name === "grupoId") {
            const grupoElegido = catalogos.grupos.find(g => g.id === Number(value));
            const esGrupoPrees = grupoElegido?.grado?.nivelAcademico === 'PREESCOLAR';

            setFormData(prev => ({
                ...prev,
                estudianteId: "",
                tipoBoletin: esGrupoPrees ? "DESCRIPTIVO" : prev.tipoBoletin
            }));
        }
    };

    // --- BOTÓN AUDITORÍA ---
    const handleAuditarNotas = async () => {
        if (!formData.grupoId || !formData.periodoActual) {
            return showWarning("Seleccione un Grupo y el Periodo a Auditar.");
        }
        try {
            setIsAuditing(true);
            // Reemplaza esto con tu función real del api/boletinesService.js
            const reporte = await fetchAuditoriaBoletines(formData.grupoId, formData.periodoActual);

            if (reporte && reporte.length > 0) {
                setReporteFaltantes(reporte);
                showWarning(`Se encontraron ${reporte.length} registros incompletos.`);
            } else {
                Swal.fire({ icon: 'success', title: '¡Todo en orden!', text: 'No hay calificaciones pendientes hasta este periodo.' });
            }
        } catch (error) {
            console.error("Error en auditoría de notas faltantes", error);
            showError("Error al auditar calificaciones.");
        } finally {
            setIsAuditing(false);
        }
    };

    // --- DESCARGAR REPORTE DE NOTAS FALTANTES EN EXCEL ---
    const descargarAuditoriaExcel = () => {
        if (!reporteFaltantes) return;

        // Buscamos la información del Grupo y también del Grado para el nombre del archivo
        const sedeInfo = catalogos.sedes.find(s => String(s.id) === String(formData.sedeId));
        const grupoInfo = catalogos.grupos.find(g => String(g.id) === String(formData.grupoId));
        const gradoInfo = catalogos.grados.find(g => String(g.id) === String(formData.gradoId));

        const nombreSede = sedeInfo ? sedeInfo.nombre : 'Sede';
        const nombreGrupo = grupoInfo ? grupoInfo.nombre : 'Grupo';
        const nombreGrado = gradoInfo ? gradoInfo.nombre : 'Grado';

        // Unimos los nombres para que quede bien claro (Ej: "SEXTO - A")
        const SedeGradoGrupo = `${nombreSede} ${nombreGrado} ${nombreGrupo}`.trim();

        // Limpiamos caracteres raros para el nombre del archivo (Ej: "SEXTO_A")
        const nombreArchivoSeguro = SedeGradoGrupo.replace(/[^\p{L}\p{N}]/gu, '_');

        const infoSuperior = [
            ["REPORTE DE AUDITORÍA: NOTAS DE BOLETÍN FALTANTES"],
            [`Grado:;"${nombreGrado}"`],
            [`Grupo:;"${nombreGrupo}"`],
            [`Sede:;"${nombreSede}"`],
            [`Periodos evaluados:;"1 al ${formData.periodoActual}"`],
            [""]
        ];

        const encabezados = ["Docente", "Asignatura", "Periodo", "Falta la nota:", "Estudiante"];
        const filas = reporteFaltantes.map(item => [
            `"${item.docente}"`, `"${item.asignatura}"`, `"${item.periodo}"`, `"${item.detalle}"`, `"${item.estudiante}"`
        ]);

        const contenidoCSV = [
            ...infoSuperior.map(f => f.join(";")),
            encabezados.join(";"),
            ...filas.map(f => f.join(";"))
        ].join("\n");

        const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);

        link.setAttribute("download", `Auditoria_Boletines_${nombreArchivoSeguro}.csv`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.grupoId || !formData.periodoActual || !formData.tipoBoletin) {
            return showWarning("Por favor complete todos los campos obligatorios.");
        }

        try {
            setLoading(true);

            // Buscamos el grupo seleccionado para extraer su nombre y el de la sede (si aplica)
            const grupoSeleccionado = catalogos.grupos.find(g => g.id === Number(formData.grupoId));

            // Buscamos al estudiante seleccionado cubriendo todas las posibles estructuras (Matrícula o Estudiante directo)
            const estudianteSeleccionado = formData.estudianteId && catalogos.estudiantes.length > 0
                ? catalogos.estudiantes.find(e =>
                    e.id === Number(formData.estudianteId) ||
                    e.estudianteId === Number(formData.estudianteId) ||
                    e.estudiante?.id === Number(formData.estudianteId)
                )
                : null;

            // Si viene anidado en "estudiante" lo extraemos, si no, usamos el objeto directo
            const datosEst = estudianteSeleccionado?.estudiante || estudianteSeleccionado;

            const payload = {
                grupoId: Number(formData.grupoId),
                periodoActual: Number(formData.periodoActual),
                tipoBoletin: formData.tipoBoletin,
                estudianteId: formData.estudianteId ? Number(formData.estudianteId) : undefined,

                nombreGrado: grupoSeleccionado && grupoSeleccionado.grado ? grupoSeleccionado.grado.codigo : 'GRADO',
                nombreGrupo: grupoSeleccionado ? grupoSeleccionado.nombre : 'GRUPO',
                nombreSede: grupoSeleccionado && grupoSeleccionado.sede ? grupoSeleccionado.sede.nombre : 'SEDE',

                estudianteDoc: datosEst ? datosEst.documento : '',
                estudianteNombre: datosEst ? datosEst.primerNombre : '',
                estudianteApellido: datosEst ? datosEst.primerApellido : ''
            };

            await generarBoletinesPDF(payload);
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: 'Boletines generados y descargados correctamente.',
                timer: 3000, // <-- Se cierra solo después de 3 segundos
                showConfirmButton: false
            });

        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- RENDER ---
    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter relative">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* TÍTULO */}
                <div className="flex items-center pb-2 border-b border-gray-200">
                    <FontAwesomeIcon icon={faFilePdf} className="text-3xl text-blue-600 mr-3" />
                    <h1 className="text-2xl font-bold text-slate-800">Generación de Boletines</h1>
                </div>

                {/* TARJETA DE FORMULARIO */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* SECCIÓN 1: UBICACIÓN */}
                        <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                            <h3 className="text-sm font-bold text-blue-800 uppercase mb-4 flex items-center">
                                <FontAwesomeIcon icon={faFilter} className="mr-2" />
                                1. Seleccione el Grupo
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClasses}>Sede <span className="text-red-500">*</span></label>
                                    <select name="sedeId" value={formData.sedeId} onChange={handleChange} className={inputClasses} required>
                                        <option value="">-- Seleccione --</option>
                                        {catalogos.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Grado <span className="text-red-500">*</span></label>
                                    <select name="gradoId" value={formData.gradoId} onChange={handleChange} className={inputClasses} required>
                                        <option value="">-- Seleccione --</option>
                                        {catalogos.grados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Grupo <span className="text-red-500">*</span></label>
                                    <select name="grupoId" value={formData.grupoId} onChange={handleChange} className={inputClasses} disabled={!formData.gradoId} required>
                                        <option value="">{!formData.gradoId ? "Elija Grado" : catalogos.grupos.length === 0 ? "Sin grupos" : "-- Seleccione --"}</option>
                                        {catalogos.grupos.map(g => (<option key={g.id} value={g.id}>{g.nombre} ({formatearJornada(g.jornada)})</option>))} {/* Usamos el formateador de jornadas aquí */}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: PARÁMETROS DEL BOLETÍN */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Opciones de Impresión */}
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClasses}>Periodo a Imprimir <span className="text-red-500">*</span></label>
                                    <select name="periodoActual" value={formData.periodoActual} onChange={handleChange} className={inputClasses} required>
                                        <option value="">-- Seleccione --</option>
                                        <option value="1">Primer Periodo</option>
                                        <option value="2">Segundo Periodo</option>
                                        <option value="3">Tercer Periodo</option>
                                        <option value="4">Cuarto Periodo</option>
                                        <option value="5">Informe Final</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Tipo de Boletín <span className="text-red-500">*</span></label>
                                    <select name="tipoBoletin" value={formData.tipoBoletin} onChange={handleChange} className={inputClasses} required>
                                        <option value="">-- Seleccione --</option>
                                        {!esPreescolar && (
                                            <option value="VALORATIVO">Boletín Valorativo (Notas + Desempeño)</option>
                                        )}
                                        <option value="DESCRIPTIVO">Boletín Descriptivo (Con Juicios y Dimensiones)</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">* Preescolar se forzará automáticamente a Descriptivo.</p>
                                </div>
                            </div>

                            {/* Opciones de Estudiante (Impresión Individual) */}
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                <label className="block text-sm font-bold text-orange-800 mb-2">Impresión Individual (Opcional)</label>
                                <p className="text-xs text-orange-700 mb-3">Si deja este campo vacío, se generará un solo archivo PDF con los boletines de todo el grupo.</p>
                                <select
                                    name="estudianteId"
                                    value={formData.estudianteId}
                                    onChange={handleChange}
                                    className={inputClasses}
                                    disabled={!formData.grupoId}
                                >
                                    {catalogos.estudiantes.map(m => (
                                        <option key={m.estudiante.id} value={m.estudiante.id}>
                                            {m.estado && m.estado !== 'ACTIVO' ? `[${m.estado}] ` : ''}
                                            {m.estudiante.primerApellido} {m.estudiante.segundoApellido} {m.estudiante.primerNombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* FOOTER Y BOTÓN */}
                        <div className="pt-6 border-t border-gray-200 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleAuditarNotas}
                                disabled={loading || isAuditing}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-70 text-lg"
                            >
                                <FontAwesomeIcon icon={isAuditing ? faSpinner : faSearch} spin={isAuditing} />
                                {isAuditing ? "Auditando..." : "Auditar Notas Faltantes"}
                            </button>

                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold shadow-md flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-70 text-lg"
                            >
                                {loading ? (
                                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                ) : (
                                    <FontAwesomeIcon icon={faPrint} className="mr-2" />
                                )}
                                {loading ? "Generando PDF..." : formData.estudianteId ? "Imprimir Boletín" : "Imprimir Lote Completo"}
                            </button>
                        </div>

                    </form>
                </div>

            </div>

            {/* MODAL DE AUDITORÍA BOLETINES */}
            {reporteFaltantes && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border-t-4 border-blue-500">
                        <div className="p-5 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                                <FontAwesomeIcon icon={faSearch} />
                                Auditoría: Notas Incompletas
                            </h3>
                            <button onClick={() => setReporteFaltantes(null)} className="text-gray-400 hover:text-gray-600">
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-700 mb-4">
                                Se encontraron <strong>{reporteFaltantes.length}</strong> campos vacíos. Si genera el boletín ahora, estas notas saldrán en blanco o afectarán el promedio.
                            </p>
                            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg shadow-inner">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-bold text-gray-600">Docente</th>
                                            <th className="px-4 py-2 text-left font-bold text-gray-600">Asignatura</th>
                                            <th className="px-4 py-2 text-left font-bold text-gray-600">Periodo</th>
                                            <th className="px-4 py-2 text-left font-bold text-red-600">Falta la nota:</th>
                                            <th className="px-4 py-2 text-left font-bold text-gray-600">Estudiante</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {reporteFaltantes.map((item, index) => (
                                            <tr key={index} className="hover:bg-blue-50/50">
                                                <td className="px-4 py-2 whitespace-nowrap">{item.docente}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">{item.asignatura}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">{item.periodo}</td>
                                                <td className="px-4 py-2 whitespace-nowrap font-bold text-red-500">{item.detalle}</td>
                                                <td className="px-4 py-2 whitespace-nowrap">{item.estudiante}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                            <span className="text-xs text-gray-500 italic">Descargue el reporte para enviarlo a los docentes.</span>
                            <div className="flex gap-3">
                                <button onClick={descargarAuditoriaExcel} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                                    <FontAwesomeIcon icon={faDownload} /> Descargar Excel
                                </button>
                                <button onClick={() => setReporteFaltantes(null)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-bold">
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GenerarBoletines;