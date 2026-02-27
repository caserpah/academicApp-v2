import React, { useState, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faFileExcel, faUpload, faCheckCircle, faExclamationTriangle,
    faTimes, faSpinner, faUndo, faInfoCircle
} from "@fortawesome/free-solid-svg-icons";
import { showSuccess, showError, showWarning } from "../../utils/notifications.js";

import { importarArchivoDocente } from "../../api/calificacionesService.js"

const CalificacionesImportModal = ({
    onClose,
    onSuccess
}) => {
    // --- ESTADOS ---
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);

    // Estado para mostrar errores SI la importación falla o tiene advertencias
    const [erroresCarga, setErroresCarga] = useState([]);

    const fileInputRef = useRef(null);

    // --- HANDLERS ---
    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            // Validar extensión simple
            if (!selected.name.match(/\.(xls|xlsx)$/)) {
                return showWarning("Solo se permiten archivos Excel (.xlsx).");
            }
            setFile(selected);
            setErroresCarga([]); // Limpiar errores previos si cambia el archivo
        }
    };

    const handleImportar = async () => {
        if (!file) return;
        setLoading(true);
        setErroresCarga([]);

        try {
            // Llamamos al servicio global
            const response = await importarArchivoDocente(file);

            // El backend puede responder 200 OK incluso con advertencias (status: 'warning')
            // La estructura esperada de response es: { status, message, data: { procesados, errores: [] } }
            const reporte = response.data || {};
            const listaErrores = reporte.errores || [];

            if (listaErrores.length > 0) {
                // Caso: Importación parcial o fallida con reporte detallado
                setErroresCarga(listaErrores);
                showWarning(response.message || "El archivo se procesó con observaciones.");

                // Si hubo procesados, notificamos al padre para refrescar
                if (reporte.procesados > 0) {
                    onSuccess();
                }
            } else {
                // Caso: Éxito total
                showSuccess(response.message || `Importación exitosa. Procesados: ${reporte.procesados}`);
                onSuccess(); // Recargar tabla
                onClose();   // Cerrar modal
            }

        } catch (error) {
            // Manejo de Errores Críticos (400/500)
            if (error.listaErrores) {
                // Si el servicio wrapper capturó un array de errores
                setErroresCarga(error.listaErrores);
            } else {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">

            {/* OVERLAY DE CARGA: Se muestra SOLO si loading es true */}
            {loading && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-xl transition-all">
                    <FontAwesomeIcon icon={faSpinner} spin size="4x" className="text-blue-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 animate-pulse">Analizando Planilla...</h3>
                    <p className="text-sm text-gray-500 mt-2">Validando estudiantes, firmas y notas.</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden relative">
                {/* HEADER */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faFileExcel} className="text-green-600" />
                        Subir Planilla de Calificaciones
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-2 hover:bg-gray-200 rounded-full">
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-8">

                    {/* VISTA 1: CARGA DE ARCHIVO */}
                    {erroresCarga.length === 0 && (
                        <div className="flex flex-col items-center justify-center space-y-6">

                            <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg text-sm flex items-start gap-3 max-w-lg">
                                <FontAwesomeIcon icon={faInfoCircle} className="mt-1" />
                                <div>
                                    <p className="font-bold">Instrucciones:</p>
                                    <ul className="list-disc pl-4 mt-1 space-y-1 text-xs text-blue-700">
                                        <li>Cargue el archivo Excel <strong>descargado previamente</strong> desde la plataforma.</li>
                                        <li>El sistema detectará automáticamente a qué grupo y asignatura corresponde cada hoja.</li>
                                        <li>Puede subir un libro con múltiples hojas (varios grupos).</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Área de Drop/Input */}
                            <div
                                className="w-full max-w-lg border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group bg-white"
                                onClick={() => fileInputRef.current.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".xlsx,.xls"
                                />
                                <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                                    <FontAwesomeIcon icon={faUpload} className="text-5xl text-gray-300 group-hover:text-blue-500" />
                                </div>
                                <p className="text-gray-700 font-semibold text-lg">
                                    {file ? file.name : "Haz clic para seleccionar tu planilla"}
                                </p>
                                <p className="text-xs text-gray-400 mt-2">Soporta archivos .xlsx</p>
                            </div>
                        </div>
                    )}

                    {/* VISTA 2: REPORTE DE ERRORES */}
                    {erroresCarga.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden shadow-sm">
                                <div className="px-4 py-3 border-b border-red-200 flex items-center justify-between bg-red-100">
                                    <div className="flex items-center gap-2">
                                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-600" />
                                        <div>
                                            <h4 className="font-bold text-red-800 text-sm">Observaciones encontradas</h4>
                                            <p className="text-xs text-red-700">Algunas filas no pudieron procesarse:</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleReset}
                                        className="text-red-700 hover:bg-red-200 px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1"
                                    >
                                        <FontAwesomeIcon icon={faUndo} /> Intentar de nuevo
                                    </button>
                                </div>

                                <div className="max-h-60 overflow-y-auto p-0">
                                    <table className="min-w-full text-sm">
                                        <tbody className="divide-y divide-red-100">
                                            {erroresCarga.map((err, idx) => (
                                                <tr key={idx} className="hover:bg-red-50 transition-colors">
                                                    <td className="px-4 py-2 text-red-600 w-8 text-center">
                                                        <FontAwesomeIcon icon={faTimes} />
                                                    </td>
                                                    <td className="px-4 py-2 text-red-800 text-xs font-mono">
                                                        {typeof err === 'string' ? err : JSON.stringify(err)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <p className="text-center text-gray-500 text-xs mt-4">
                                Revise el archivo Excel, corrija los errores indicados y vuelva a cargarlo.
                            </p>
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
                            className={`px-6 py-2 rounded-lg shadow-md transition flex items-center gap-2 text-white font-bold
                                ${loading || !file
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700 hover:shadow-lg transform hover:-translate-y-0.5'}
                            `}
                        >
                            {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheckCircle} />}
                            {loading ? "Procesando..." : "Importar Notas"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalificacionesImportModal;