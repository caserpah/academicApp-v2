import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBalanceScale, faSave, faTimes, faFileUpload, faFilePdf, faEye } from "@fortawesome/free-solid-svg-icons";
import { API_BASE_URL } from "../../api/apiClient.js";

const ActaNivelacionModal = ({
    isOpen,
    onClose,
    onConfirm,
    studentData // Recibe toda la fila del estudiante
}) => {
    const [notaNivelacion, setNotaNivelacion] = useState("");
    const [observacion, setObservacion] = useState("");
    const [archivo, setArchivo] = useState(null);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cargar datos al abrir
    useEffect(() => {
        if (isOpen && studentData) {
            setNotaNivelacion(studentData.notaNivelacion || "");
            setObservacion(studentData.observacion_nivelacion || "");
            setArchivo(null);
            setError("");
        }
    }, [isOpen, studentData]);

    if (!isOpen || !studentData) return null;

    const { nombreCompleto, notaDefinitivaOriginal, url_evidencia_nivelacion } = studentData;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setError("El tamaño del archivo supera el límite permitido de 5MB.");
                return;
            }
            setArchivo(file);
            setError("");
        }
    };

    const handleSubmit = async () => {
        const notaParsed = parseFloat(notaNivelacion);

        if (isNaN(notaParsed) || notaParsed < 1.0 || notaParsed > 5.0) {
            setError("La nota de nivelación debe ser un número entre 1.0 y 5.0.");
            return;
        }

        // Si es la primera vez que nivela, obligamos a poner observación o archivo
        if (!url_evidencia_nivelacion && !archivo && (!observacion || observacion.length < 5)) {
            setError("Debe adjuntar una evidencia o escribir una observación detallada del proceso.");
            return;
        }

        try {
            setIsSubmitting(true);
            await onConfirm({
                notaNivelacion: notaParsed.toFixed(2),
                observacion_nivelacion: observacion,
                evidencia: archivo // Si es null, el servicio simplemente no lo enviará
            });
        } catch (err) {
            setError(err.message || "Error al guardar el acta.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border-t-4 border-blue-500">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faBalanceScale} className="text-blue-600" />
                        Acta de Nivelación
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Info Estudiante */}
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="text-sm font-bold text-gray-800">{nombreCompleto}</p>
                        <p className="text-xs text-gray-500">
                            Nota Definitiva Anual: <span className="font-bold text-red-600">{notaDefinitivaOriginal}</span>
                        </p>
                    </div>

                    {/* Evidencia Existente */}
                    {url_evidencia_nivelacion && (
                        <div className="bg-green-50 p-3 rounded border border-green-200 flex justify-between items-center">
                            <span className="text-xs text-green-800 font-bold">Evidencia Actual Cargada</span>
                            <a
                                href={`${API_BASE_URL}${url_evidencia_nivelacion}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faEye} /> Ver Documento
                            </a>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                        {/* Input Nota */}
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Nota Examen *</label>
                            <input
                                type="number"
                                step="0.1"
                                min="1.0"
                                max="5.0"
                                value={notaNivelacion}
                                onChange={(e) => setNotaNivelacion(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-3 text-lg font-bold text-center text-blue-700 focus:ring-2 focus:ring-blue-200 outline-none"
                                placeholder="0.0"
                            />
                        </div>

                        {/* Input Archivo */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                                {url_evidencia_nivelacion ? "Reemplazar Evidencia (PDF/IMG)" : "Cargar Evidencia (PDF/IMG)"}
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2 h-[52px] flex items-center justify-center hover:bg-gray-50 cursor-pointer relative transition-colors">
                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                {archivo ? (
                                    <div className="text-green-600 text-xs font-medium truncate px-2 flex items-center gap-1">
                                        <FontAwesomeIcon icon={faFilePdf} /> {archivo.name}
                                    </div>
                                ) : (
                                    <div className="text-gray-400 text-xs flex items-center gap-2">
                                        <FontAwesomeIcon icon={faFileUpload} className="text-lg" />
                                        <span>Clic para cargar</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Textarea Observación */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Observaciones del proceso</label>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                            rows="2"
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                            placeholder="Ej. El estudiante presentó trabajo escrito y sustentación oral..."
                        />
                    </div>

                    {error && <p className="text-xs text-red-500 font-bold text-center animate-pulse">{error}</p>}
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} disabled={isSubmitting} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm shadow-md flex gap-2 items-center transition-colors disabled:opacity-70"
                    >
                        {isSubmitting ? <FontAwesomeIcon icon={faBalanceScale} spin /> : <FontAwesomeIcon icon={faSave} />}
                        Guardar Acta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActaNivelacionModal;