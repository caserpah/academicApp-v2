import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileExcel, faUpload, faCheckCircle, faExclamationTriangle,
    faTimes, faSpinner, faDownload, faUndo
} from "@fortawesome/free-solid-svg-icons";
import { descargarPlantilla, importarArchivo } from "../../api/juiciosService.js";
import { showSuccess, showError, showWarning } from "../../utils/notifications.js";

const JuiciosImportModal = ({ onClose, onSuccess }) => {
    // --- ESTADOS ---
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Estado para mostrar errores SI la importación falla
    const [erroresCarga, setErroresCarga] = useState([]);

    const fileInputRef = useRef(null);

    // --- HANDLERS ---
    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            // Validar extensión simple
            if (!selected.name.match(/\.(xls|xlsx|csv)$/)) {
                return showWarning("Solo se permiten archivos Excel (.xlsx, .xls) o CSV.");
            }
            setFile(selected);
            setErroresCarga([]); // Limpiar errores previos si cambia el archivo
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await descargarPlantilla();
        } catch (err) {
            console.error(err);
            showError("Error descargando la plantilla.");
        }
    };

    const handleImportar = async () => {
        if (!file) return;
        setLoading(true);
        setErroresCarga([]);

        try {
            // Enviamos el archivo. El backend valida y guarda en una sola transacción.
            const response = await importarArchivo(file);

            // Si llegamos aquí, fue exitoso (200 OK)
            showSuccess(response.message || "Importación masiva completada exitosamente.");
            onSuccess(); // Recargar tabla
            onClose();   // Cerrar modal

        } catch (error) {

            // Manejo de Errores
            if (error.listaErrores && Array.isArray(error.listaErrores)) {
                // Guardamos los errores en el estado para que React pinte la tabla
                setErroresCarga(error.listaErrores);

                // NO lanzamos la alerta emergente (showError) o lanzamos una suave.
                // Si lanzas showError aquí, el usuario cerrará la alerta y quizás cierre el modal sin ver la tabla.
                // Mejor solo un warning pequeño o nada, porque la tabla roja ya es muy evidente.
                showWarning("Revisa la lista de errores en pantalla.");
            } else {
                // Si es un error genérico (ej: servidor caído), sí mostramos la alerta
                showError(error.message || "Error al procesar el archivo.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setErroresCarga([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // --- RENDERIZADO ---
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

            {/* OVERLAY DE CARGA: Se muestra SOLO si loading es true */}
            {loading && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-xl transition-all">
                    <FontAwesomeIcon icon={faSpinner} spin size="4x" className="text-blue-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 animate-pulse">Procesando archivo...</h3>
                    <p className="text-sm text-gray-500 mt-2">Por favor espera, esto puede tardar unos minutos.</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
                {/* HEADER */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
                        Importación Masiva de Juicios
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>

                {/* BODY (SCROLLABLE) */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

                    {/* VISTA 1: CARGA DE ARCHIVO (Si no hay errores mostrándose) */}
                    {erroresCarga.length === 0 && (
                        <div className="flex flex-col items-center justify-center space-y-6 py-4">

                            {/* Botón Descargar Plantilla */}
                            <div className="w-full max-w-md bg-blue-50 border border-blue-100 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-blue-800 text-sm">¿No tienes el formato?</p>
                                    <p className="text-xs text-blue-600">Descarga la plantilla oficial para llenar los datos.</p>
                                </div>
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-2 rounded text-sm font-semibold transition"
                                >
                                    <FontAwesomeIcon icon={faDownload} className="mr-2" />
                                    Descargar
                                </button>
                            </div>

                            {/* Área de Carga */}
                            <div
                                className="w-full max-w-md border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer bg-white"
                                onClick={() => fileInputRef.current.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv"
                                />
                                <FontAwesomeIcon icon={faUpload} className="text-4xl text-gray-300 mb-4" />
                                <p className="text-gray-600 font-medium">
                                    {file ? file.name : "Haz clic para seleccionar el archivo"}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">Soporta Excel (.xlsx)</p>
                            </div>
                        </div>
                    )}

                    {/* VISTA 2: LISTA DE ERRORES (Solo si falló la carga) */}
                    {erroresCarga.length > 0 && (
                        <div className="bg-white rounded-lg shadow border border-red-100 overflow-hidden animate-fade-in">
                            <div className="bg-red-100 px-4 py-3 border-b border-red-200 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600" />
                                    <div>
                                        <h4 className="font-bold text-red-800 text-sm">La importación falló</h4>
                                        <p className="text-xs text-red-600">Corrige los siguientes errores y vuelve a intentarlo.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="text-red-700 hover:bg-red-200 px-3 py-1 rounded text-xs font-bold transition"
                                >
                                    <FontAwesomeIcon icon={faUndo} className="mr-1" />
                                    Subir otro archivo
                                </button>
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-center w-16">
                                                <FontAwesomeIcon icon={faExclamationTriangle} />
                                            </th>
                                            <th className="px-4 py-2 text-left">Detalle del Error</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {erroresCarga.map((err, idx) => (
                                            <tr key={idx} className="hover:bg-red-50">
                                                {/* Asumiendo que el error es un string tipo "Fila 5: Mensaje" o un objeto */}
                                                <td className="px-4 py-2 font-mono font-bold text-red-600 w-20">
                                                    {/* Ajusta esto según cómo venga tu string de error */}
                                                    <FontAwesomeIcon icon={faTimes} className="mr-2" />
                                                </td>
                                                <td className="px-4 py-2 text-red-700">
                                                    {typeof err === 'string' ? err : err.message}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                </div>

                {/* FOOTER */}
                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition"
                    >
                        Cancelar
                    </button>

                    {/* Botón de Acción Principal */}
                    {erroresCarga.length === 0 && (
                        <button
                            onClick={handleImportar}
                            disabled={loading || !file}
                            className={`px-6 py-2 rounded-lg shadow transition flex items-center gap-2 text-white
                                ${loading || !file ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
                            `}
                        >
                            {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheckCircle} />}
                            {loading ? "Procesando..." : "Importar Datos"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JuiciosImportModal;