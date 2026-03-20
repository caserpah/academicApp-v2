import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSave, faQuoteLeft, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

const RecomendacionesModal = ({
    isOpen,
    onClose,
    onSave,
    studentName,
    initialRec1 = "",
    initialRec2 = "",
    bancoOptions = [],
    isReadOnly = false
}) => {
    const [rec1, setRec1] = useState("");
    const [rec2, setRec2] = useState("");

    useEffect(() => {
        if (isOpen) {
            setRec1(initialRec1 || "");
            setRec2(initialRec2 || "");
        }
    }, [isOpen, initialRec1, initialRec2]);

    if (!isOpen) return null;

    // Funciones de Limpieza
    const clearRec1 = () => setRec1("");
    const clearRec2 = () => setRec2("");

    // Manejadores de Select (Funcionan como plantillas que sobreescriben el texto)
    const handleSelectRec1 = (e) => setRec1(e.target.value);
    const handleSelectRec2 = (e) => setRec2(e.target.value);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-300 bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <FontAwesomeIcon icon={faQuoteLeft} className="text-blue-500" />
                        Observaciones: <span className="text-blue-600">{studentName}</span>
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <FontAwesomeIcon icon={faTimes} className="text-xl" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* --- AVISO DE MODO LECTURA --- */}
                    {isReadOnly && (
                        <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                            <FontAwesomeIcon icon={faQuoteLeft} className="text-orange-500" />
                            <strong>Modo Lectura:</strong> El periodo está cerrado. No puedes editar estas observaciones.
                        </div>
                    )}

                    {/* --- RECOMENDACIÓN 1 --- */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Observación 1</label>
                        <select
                            className={`w-full border mb-2 border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none
                                ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
                            `}
                            onChange={handleSelectRec1}
                            value=""
                            disabled={isReadOnly}
                        >
                            <option value="" disabled>-- Seleccionar del Banco de Observaciones --</option>
                            {bancoOptions.map((opcion) => (
                                <option key={opcion.id} value={opcion.descripcion}>
                                    [{opcion.categoria}] {opcion.descripcion.substring(0, 60)}...
                                </option>
                            ))}
                        </select>

                        <div className="relative">
                            <textarea
                                className={`w-full border border-gray-300 rounded p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none pr-10 
                                    ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
                                `}
                                rows="3"
                                value={rec1}
                                onChange={(e) => setRec1(e.target.value)}
                                readOnly={isReadOnly}
                                placeholder={!isReadOnly ? "Escribe una observación o selecciona una del banco..." : ""}
                            />
                            {/* OCULTAMOS LA PAPELERA SI ES SOLO LECTURA */}
                            {!isReadOnly && rec1 && (
                                <button
                                    onClick={clearRec1}
                                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-all z-10"
                                    title="Borrar texto"
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={faTrashAlt} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* --- RECOMENDACIÓN 2 --- */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Observación 2 (Opcional)</label>
                        <select
                            className={`w-full border mb-2 border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500 outline-none
                                ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
                            `}
                            onChange={handleSelectRec2}
                            value=""
                            disabled={isReadOnly}
                        >
                            <option value="" disabled>-- Seleccionar del Banco de Observaciones --</option>
                            {bancoOptions.map((opcion) => (
                                <option key={opcion.id} value={opcion.descripcion}>
                                    [{opcion.categoria}] {opcion.descripcion.substring(0, 60)}...
                                </option>
                            ))}
                        </select>

                        <div className="relative">
                            <textarea
                                className={`w-full border border-gray-300 rounded p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none pr-10 
                                    ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}
                                `}
                                rows="3"
                                value={rec2}
                                onChange={(e) => setRec2(e.target.value)}
                                readOnly={isReadOnly}
                                placeholder={!isReadOnly ? "Escribe una observación o selecciona una del banco..." : ""}
                            />
                            {/* OCULTAMOS LA PAPELERA SI ES SOLO LECTURA */}
                            {!isReadOnly && rec2 && (
                                <button
                                    onClick={clearRec2}
                                    className="absolute top-2 right-2 text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-all z-10"
                                    title="Borrar texto"
                                    type="button"
                                >
                                    <FontAwesomeIcon icon={faTrashAlt} />
                                </button>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="border-gray-300 p-4 border-t flex justify-end gap-3 bg-gray-50">
                    {/* SE OCULTA EN MODO LECTURA */}
                    {!isReadOnly && (
                        <button
                            onClick={() => onSave(rec1, rec2)}
                            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                        >
                            <FontAwesomeIcon icon={faSave} />
                            Guardar
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className={`${isReadOnly ? 'bg-gray-500 hover:bg-gray-600' : 'bg-red-500 hover:bg-red-600'} text-white px-5 py-2 rounded-lg transition flex items-center shadow-md`}
                    >
                        {isReadOnly ? "Cerrar" : "Cancelar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecomendacionesModal;