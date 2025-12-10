import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faBuilding, faCalendarDay } from "@fortawesome/free-solid-svg-icons";

/**
 * Modal para asignar sedes a coordinadores.
 */
const AsignarSedeModal = ({
    coordinador,
    sedes,
    onClose,
    onSubmit,
    loading
}) => {
    const [formData, setFormData] = useState({
        sedeId: "",
        jornada: "mañana"
    });

    const jornadas = [
        { value: "mañana", label: "Mañana" },
        { value: "tarde", label: "Tarde" },
        { value: "completa", label: "Completa" },
        { value: "noche", label: "Noche" }
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.sedeId) {
            alert("Por favor seleccione una sede.");
            return;
        }
        onSubmit(formData);
    };

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const getSedeNombre = (sedeId) => {
        const sede = sedes.find(s => s.id === parseInt(sedeId));
        return sede ? `${sede.codigo} - ${sede.nombre}` : "";
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={handleOverlayClick}
        >
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="bg-purple-600 text-white p-4 rounded-t-xl flex justify-between items-center">
                    <div className="flex items-center">
                        <FontAwesomeIcon icon={faBuilding} className="w-5 h-5 mr-2" />
                        <h2 className="text-lg font-semibold">Asignar Coordinador a Sede</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-gray-200 transition"
                        disabled={loading}
                    >
                        <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-gray-600 mb-1">Coordinador seleccionado:</p>
                        <p className="font-medium text-gray-800">{coordinador.nombres}</p>
                        <p className="text-sm text-gray-600">Documento: {coordinador.numeroDocumento}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Sede */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sede{" "}
                                <span className="text-red-500 font-semibold">*</span>
                            </label>
                            <select
                                name="sedeId"
                                value={formData.sedeId}
                                onChange={handleChange}
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500"
                                disabled={loading}
                            >
                                <option value="">Seleccione una sede...</option>
                                {sedes.map(sede => (
                                    <option key={sede.id} value={sede.id}>
                                        {sede.codigo} - {sede.nombre} ({sede.direccion})
                                    </option>
                                ))}
                            </select>
                            {formData.sedeId && (
                                <p className="text-xs text-green-600 mt-1">
                                    Seleccionada: {getSedeNombre(formData.sedeId)}
                                </p>
                            )}
                        </div>

                        {/* Jornada */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Jornada{" "}
                                <span className="text-red-500 font-semibold">*</span>
                            </label>
                            <div className="flex space-x-2">
                                {jornadas.map(jornada => (
                                    <label
                                        key={jornada.value}
                                        className={`flex-1 border rounded-lg p-3 text-center cursor-pointer transition-all ${formData.jornada === jornada.value ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-300 hover:border-purple-300'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="jornada"
                                            value={jornada.value}
                                            checked={formData.jornada === jornada.value}
                                            onChange={handleChange}
                                            className="sr-only"
                                            disabled={loading}
                                        />
                                        <FontAwesomeIcon 
                                            icon={faCalendarDay} 
                                            className={`w-4 h-4 mr-2 ${formData.jornada === jornada.value ? 'text-purple-600' : 'text-gray-400'}`}
                                        />
                                        <span className="text-sm font-medium">{jornada.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Descripción de jornadas */}
                        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                            <p><strong>Mañana:</strong> 6:00 AM - 12:00 PM</p>
                            <p><strong>Tarde:</strong> 12:00 PM - 6:00 PM</p>
                            <p><strong>Completa:</strong> 6:00 AM - 6:00 PM</p>
                            <p><strong>Noche:</strong> 6:00 PM - 10:00 PM</p>
                        </div>

                        {/* Botones */}
                        <div className="pt-4 flex justify-end space-x-3 border-t border-gray-200 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Asignando...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faBuilding} className="w-4 h-4 mr-2" />
                                        Asignar Sede
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AsignarSedeModal;