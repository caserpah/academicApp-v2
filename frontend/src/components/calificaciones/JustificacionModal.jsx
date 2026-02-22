import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle, faSave, faTimes, faFileUpload, faFilePdf, faEye } from "@fortawesome/free-solid-svg-icons";

// URL base para descargar archivos
const API_URL = "http://localhost:3001/";

const JustificacionModal = ({
    isOpen,
    onClose,
    onConfirm,
    initialObservacion = "",
    initialUrl = "" // Recibimos la URL existente
}) => {
    const [observacion, setObservacion] = useState("");
    const [archivo, setArchivo] = useState(null);
    const [error, setError] = useState("");

    // Estado Modo Edición: Si viene info inicial, arrancamos en modo "Lectura" (false). Si no, "Edición" (true).
    const [isEditing, setIsEditing] = useState(false);

    // Cargar datos iniciales al abrir
    useEffect(() => {
        if (isOpen) {
            setObservacion(initialObservacion || "");
            setArchivo(null); // Reseteamos archivo nuevo
            setError("");
            // Si no hay observación previa, es un registro nuevo -> Editar TRUE
            // Si YA hay observación, es visualización -> Editar FALSE
            setIsEditing(!initialObservacion);
        }
    }, [isOpen, initialObservacion]);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validación básica de tamaño (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError("El tamaño del archivo supera límite permitido 5MB.");
                return;
            }
            setArchivo(file);
            setError("");
        }
    };

    const handleSubmit = () => {
        if (!observacion.trim() || observacion.length < 5) {
            setError("La observación es obligatoria y debe ser detallada.");
            return;
        }

        onConfirm(observacion, archivo); // Si archivo es null, el backend mantendrá el anterior o quedará null
        setObservacion("");
        setArchivo(null);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border-t-4 border-orange-500">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 bg-orange-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-orange-500" />
                        Modificación Extemporánea
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    {/* Botón para activar edición si estamos viendo algo existente */}
                    {!isEditing && initialObservacion && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="text-xs text-blue-600 underline hover:text-blue-800"
                            >
                                ¿Desea modificar esta justificación?
                            </button>
                        </div>
                    )}

                    {/* Mostrar evidencia existente si la hay */}
                    {initialUrl && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200 flex justify-between items-center">
                            <span className="text-xs text-blue-800 font-bold">Evidencia Actual Cargada</span>
                            <a
                                href={`${API_URL}${initialUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faEye} /> Ver Documento
                            </a>
                        </div>
                    )}

                    {/* Textarea: Solo lectura si !isEditing */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">Motivo del cambio *</label>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-200 outline-none"
                            rows="3"
                            value={observacion}
                            onChange={(e) => setObservacion(e.target.value)}
                            readOnly={!isEditing}
                        />
                    </div>

                    {/* Input Archivo: Oculto si no es edición */}
                    {isEditing && (
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                                {initialUrl ? "Reemplazar Evidencia (Opcional)" : "Cargar Evidencia (Opcional)"}
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 cursor-pointer relative">
                                <input type="file" accept=".pdf,.jpg,.png" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                {archivo ? (
                                    <div className="text-green-600 flex items-center justify-center gap-2 font-medium">
                                        <FontAwesomeIcon icon={faFilePdf} /> {archivo.name}
                                    </div>
                                ) : (
                                    <div className="text-gray-400">
                                        <FontAwesomeIcon icon={faFileUpload} className="text-2xl mb-1" />
                                        <p className="text-xs">Clic para cargar (PDF, Imagen)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {error && <p className="text-xs text-red-500 font-bold text-center">{error}</p>}
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm">Cancelar</button>

                    {/* Botón Guardar: Solo si estamos editando */}
                    {isEditing && (
                        <button onClick={handleSubmit} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm shadow-md flex gap-2 items-center">
                            <FontAwesomeIcon icon={faSave} /> Guardar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JustificacionModal;