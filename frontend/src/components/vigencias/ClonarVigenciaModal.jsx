import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faCopy, faTimes, faExclamationTriangle, faSpinner, faCheckCircle
} from "@fortawesome/free-solid-svg-icons";

const ClonarVigenciaModal = ({ isOpen, onClose, vigenciaDestino, vigenciasDisponibles, onClonar, loading }) => {
    const [origenId, setOrigenId] = useState("");
    const [opciones, setOpciones] = useState({
        areas: false,
        asignaturas: false,
        grupos: false,
        desempenos: false
    });

    // Reiniciar estado cada vez que se abre el modal
    useEffect(() => {
        if (isOpen) {
            setOrigenId("");
            setOpciones({ areas: false, asignaturas: false, grupos: false, desempenos: false });
        }
    }, [isOpen]);

    if (!isOpen || !vigenciaDestino) return null;

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setOpciones(prev => {
            const nuevas = { ...prev, [name]: checked };
            // Asignaturas requiere Áreas
            if (name === "asignaturas" && checked) nuevas.areas = true;
            if (name === "areas" && !checked) nuevas.asignaturas = false;
            return nuevas;
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onClonar(vigenciaDestino.id, { vigenciaOrigenId: origenId, opciones });
    };

    // Excluir la vigencia actual de la lista de orígenes
    const origenesValidos = vigenciasDisponibles.filter(v => v.id !== vigenciaDestino.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in font-inter">

            {/* OVERLAY DE CARGA */}
            {loading && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-xl transition-all">
                    <FontAwesomeIcon icon={faSpinner} spin size="4x" className="text-blue-600 mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 animate-pulse">Clonando configuración...</h3>
                    <p className="text-sm text-gray-500 mt-2">Por favor espera, esto puede tardar unos momentos.</p>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden relative">

                {/* HEADER */}
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
                    <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCopy} className="text-emerald-600" />
                        Clonar configuración de año lectivo
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-600 transition">
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>

                {/* BODY */}
                <form id="clonarForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* BANNER INFORMATIVO */}
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-3">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 text-lg mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                            <p className="font-bold mb-0.5">Destino: Año Lectivo {vigenciaDestino.anio}</p>
                            <p className="text-xs text-amber-700">
                                Los datos seleccionados se copiarán al año lectivo destino. Asegúrese de que no existan registros previos en los módulos que desea clonar.
                            </p>
                        </div>
                    </div>

                    {/* SELECCIÓN DE ORIGEN */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">
                            Copiar desde el Año Lectivo <span className="text-red-500">*</span>
                        </label>
                        <select
                            className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 text-sm bg-white"
                            value={origenId}
                            onChange={(e) => setOrigenId(e.target.value)}
                            required
                        >
                            <option value="">-- Seleccione el año de origen --</option>
                            {origenesValidos.map(v => (
                                <option key={v.id} value={v.id}>{v.anio}</option>
                            ))}
                        </select>
                    </div>

                    {/* MÓDULOS A CLONAR */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Seleccione los elementos a clonar <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50/50">

                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-white transition border border-transparent hover:border-gray-200">
                                <input
                                    type="checkbox" name="areas"
                                    checked={opciones.areas} onChange={handleCheckboxChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Áreas Académicas</span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-white transition border border-transparent hover:border-gray-200">
                                <input
                                    type="checkbox" name="asignaturas"
                                    checked={opciones.asignaturas} onChange={handleCheckboxChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Asignaturas</span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-white transition border border-transparent hover:border-gray-200">
                                <input
                                    type="checkbox" name="grupos"
                                    checked={opciones.grupos} onChange={handleCheckboxChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Grupos</span>
                            </label>

                            <label className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-white transition border border-transparent hover:border-gray-200">
                                <input
                                    type="checkbox" name="desempenos"
                                    checked={opciones.desempenos} onChange={handleCheckboxChange}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Rangos de Desempeño</span>
                            </label>

                        </div>
                    </div>
                </form>

                {/* FOOTER */}
                <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        form="clonarForm"
                        disabled={loading || !origenId || !Object.values(opciones).some(v => v)}
                        className={`px-6 py-2 rounded-lg shadow transition flex items-center gap-2 text-white font-medium
                            ${loading || !origenId || !Object.values(opciones).some(v => v)
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'}
                        `}
                    >
                        {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faCheckCircle} />}
                        {loading ? "Procesando..." : "Ejecutar Clonación"}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ClonarVigenciaModal;