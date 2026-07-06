import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faFilePdf, faInfoCircle, faUpload, faEye } from "@fortawesome/free-solid-svg-icons";
import { registrarNivelacion } from "../../api/nivelacionesService.js";
import { showWarning, showError } from "../../utils/notifications.js";

const NivelacionForm = ({
    registroOriginal,
    areaId,
    onSuccess,
    onCancel,
    soloLectura
}) => {
    // --- BANDERAS Y EXTRACCIÓN DE DATOS ---
    const nombreCompleto = registroOriginal.nombreEstudiante || "Estudiante";
    const notaOriginal = registroOriginal.notaOriginalArea || 0;
    const yaEvaluado = registroOriginal.estadoFinal !== "PENDIENTE";
    const urlEvidenciaExistente = registroOriginal.urlEvidencia || null;

    // --- ESTADOS ---
    // Si notaNivelacion viene en null (estado PENDIENTE), el input arranca vacío ("").
    // Si ya existe una notaNivelacion (ej: 3.0), se formatea y se muestra en el input.
    const [nota, setNota] = useState(registroOriginal.notaNivelacion ? Number(registroOriginal.notaNivelacion).toFixed(2) : "");
    const [observacion, setObservacion] = useState(registroOriginal.observacion || "");
    const [archivo, setArchivo] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- CLASES CSS ---
    const inputClasses = "w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:text-gray-500";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    // --- HANDLERS ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/pdf") {
                showWarning("El archivo de evidencia debe ser un formato PDF.");
                e.target.value = null;
                setArchivo(null);
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                showWarning("El archivo es demasiado grande. El máximo permitido es 2 MB.");
                e.target.value = null;
                setArchivo(null);
                return;
            }
            setArchivo(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones manuales
        const notaNum = parseFloat(nota);
        if (isNaN(notaNum) || notaNum < 1.0 || notaNum > 3.0) {
            return showWarning("La nota de nivelación debe estar entre 1.0 y 3.0.");
        }

        try {
            setLoading(true);

            const formData = new FormData();
            formData.append("notaNivelacion", notaNum);

            if (observacion.trim() !== "") {
                formData.append("observacion_nivelacion", observacion.trim());
            }

            // Solo se adjunta si el profesor subió el archivo
            if (archivo) {
                formData.append("evidencia", archivo);
            }

            // Ajuste: Usamos registroOriginal.matriculaId
            await registrarNivelacion(registroOriginal.matriculaId, areaId, formData);

            onSuccess();
        } catch (error) {
            showError(error.message || "Ocurrió un error al guardar la nota de nivelación.");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERIZADO TIPO MODAL ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in">

                <div className="flex justify-between items-center p-5 border-b border-gray-300 bg-gray-50">
                    <h2 className="text-xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={faUpload} className="mr-3 text-blue-600" />
                        Registrar Nivelación
                    </h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-red-500 transition">
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md">
                        <div className="flex">
                            <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 mt-0.5 mr-3" />
                            <div>
                                <h3 className="text-sm font-bold text-blue-800">Estudiante: {nombreCompleto}</h3>
                                <p className="text-xs text-blue-700 mt-1">
                                    Nota definitiva original del Área: <span className="font-bold text-red-600">{Number(notaOriginal).toFixed(2)}</span>
                                </p>

                                {/* Listar asignaturas asociadas que causaron la pérdida */}
                                {registroOriginal.detalleAsignaturas?.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-blue-200/60">
                                        <p className="text-xs font-bold text-blue-800 mb-1">Asignaturas a nivelar:</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {registroOriginal.detalleAsignaturas
                                                .filter(asig => asig.responsablePerdida)
                                                .map((asig, i) => (
                                                    <span key={i} className="bg-white/80 text-red-700 border border-red-200 text-[11px] px-2 py-0.5 rounded font-semibold">
                                                        {asig.nombre} ({Number(asig.notaFinal).toFixed(2)})
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <form id="nivelacion-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className={labelClasses}>Nota de Recuperación <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="1.0"
                                    max="3.0"
                                    value={nota}
                                    onChange={e => setNota(e.target.value)}
                                    className={inputClasses}
                                    placeholder="Ej: 3.0"
                                    required
                                    disabled={loading || soloLectura}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>Evidencia (PDF) {yaEvaluado ? <span className="text-blue-500 font-bold">(Para Reemplazar)</span> : <span className="text-gray-400 font-normal">(Opcional)</span>}</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={handleFileChange}
                                            className={`${inputClasses} pl-10 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer`}
                                            disabled={loading || soloLectura}
                                        />
                                        <FontAwesomeIcon icon={faFilePdf} className="absolute left-3 top-3 text-gray-400" />
                                    </div>
                                    {/* Botón para ver la evidencia existente */}
                                    {urlEvidenciaExistente && (
                                        <a
                                            href={`${import.meta.env.VITE_API_BASE_URL || "http://localhost:3001"}${urlEvidenciaExistente}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-gray-100 border border-gray-300 text-gray-700 px-3 flex items-center justify-center rounded-md hover:bg-gray-200 transition"
                                            title="Ver documento cargado previamente"
                                        >
                                            <FontAwesomeIcon icon={faEye} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className={labelClasses}>Observaciones Adicionales</label>
                            <textarea
                                rows="3"
                                value={observacion}
                                onChange={e => setObservacion(e.target.value)}
                                className={`${inputClasses} resize-none`}
                                placeholder="Escriba alguna observación sobre el proceso (opcional)..."
                                maxLength="500"
                                disabled={loading || soloLectura}
                            ></textarea>
                            <p className="text-[10px] text-gray-400 text-right mt-1">{observacion.length}/500</p>
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-gray-300 bg-gray-50 flex justify-end gap-3">
                    {/* Solo mostramos el botón de guardar si NO es de solo lectura */}
                    {!soloLectura && (
                        <button
                            type="submit"
                            form="nivelacion-form"
                            disabled={loading}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                        >
                            <FontAwesomeIcon icon={faSave} className="mr-2" />
                            {yaEvaluado ? "Actualizar Nivelación" : "Guardar Nivelación"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition flex items-center shadow-md"
                    >
                        <FontAwesomeIcon icon={faTimes} className="mr-2" />
                        {soloLectura ? "Cerrar Vista" : "Cancelar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NivelacionForm;