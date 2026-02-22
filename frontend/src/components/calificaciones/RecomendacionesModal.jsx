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
    bancoOptions = []
}) => {
    const [rec1, setRec1] = useState(initialRec1);
    const [rec2, setRec2] = useState(initialRec2);

    // Sincronizar estado cuando se abre el modal con nuevos datos
    useEffect(() => {
        if (isOpen) {
            setRec1(initialRec1 || "");
            setRec2(initialRec2 || "");
        }
    }, [isOpen, initialRec1, initialRec2]);

    if (!isOpen) return null;

    const handleSelectChange = (e, setFunction) => {
        const selectedText = e.target.value;
        if (!selectedText) return;
        setFunction(selectedText);
    };

    // Agregar función limpiar
    const clearRec1 = () => setRec1("");
    const clearRec2 = () => setRec2("");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-300 bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <FontAwesomeIcon icon={faQuoteLeft} />
                        Recomendaciones: {studentName}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <FontAwesomeIcon icon={faTimes} className="text-xl" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Recomendación 1 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recomendación 1</label>

                        {/* Selector del Banco */}
                        <select
                            className="w-full border mb-3 border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            onChange={(e) => handleSelectChange(e, setRec1, rec1)}
                            defaultValue=""
                        >
                            <option value="" disabled>-- Seleccionar del Banco de Frases --</option>
                            {bancoOptions.map((opcion) => (
                                <option key={opcion.id} value={opcion.descripcion}>
                                    {/* Mostramos Categoria y Tipo para que sea útil al docente */}
                                    [{opcion.categoria} - {opcion.tipo}] {opcion.descripcion.substring(0, 60)}...
                                </option>
                            ))}
                        </select>

                        {/* Área de Texto Libre */}
                        <div className="relative group"> {/* Contenedor relativo para posicionar el botón */}
                            <textarea
                                className="w-full border border-gray-300 rounded p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all pr-10" // pr-10 para dar espacio al botón
                                rows="3"
                                placeholder="Seleccione una observación del banco..."
                                value={rec1}
                                onChange={(e) => setRec1(e.target.value)}
                                readOnly
                            />
                        </div>
                        {/* Botón Limpiar dentro del area */}
                        {rec1 && (
                            <button
                                onClick={clearRec1}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 bg-white p-1.5 rounded-md border border-gray-200 shadow-sm transition-all hover:bg-red-50"
                                title="Borrar recomendación"
                                type="button"
                            >
                                <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                        )}
                    </div>

                    {/* Recomendación 2 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Recomendación 2 (Opcional)</label>
                        <select
                            className="w-full border mb-3 border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            onChange={(e) => handleSelectChange(e, setRec2, rec2)}
                            defaultValue=""
                        >
                            <option value="" disabled>-- Seleccionar del Banco de Frases --</option>
                            {bancoOptions.map((opcion) => (
                                <option key={opcion.id} value={opcion.descripcion}>
                                    {/* Mostramos Categoria y Tipo para que sea útil al docente */}
                                    [{opcion.categoria} - {opcion.tipo}] {opcion.descripcion.substring(0, 60)}...
                                </option>
                            ))}
                        </select>
                        <div className="relative group"> {/* Contenedor relativo para posicionar el botón */}
                            <textarea
                                className="w-full border border-gray-300 rounded p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all pr-10" // pr-10 para dar espacio al botón
                                rows="3"
                                placeholder="Seleccione una observación del banco..."
                                value={rec1}
                                onChange={(e) => setRec2(e.target.value)}
                                readOnly
                            />
                        </div>

                        {/* Botón Limpiar dentro del area */}
                        {rec1 && (
                            <button
                                onClick={clearRec2}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 bg-white p-1.5 rounded-md border border-gray-200 shadow-sm transition-all hover:bg-red-50"
                                title="Borrar recomendación"
                                type="button"
                            >
                                <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-gray-300 p-4 border-t flex justify-end gap-3">
                    <button
                        onClick={() => onSave(rec1, rec2)}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                    >
                        <FontAwesomeIcon icon={faSave} />
                        Guardar
                    </button>
                    <button
                        onClick={onClose}
                        className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition flex items-center shadow-md"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecomendacionesModal;