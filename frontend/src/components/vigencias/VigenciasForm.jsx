import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes } from "@fortawesome/free-solid-svg-icons";

const VigenciasForm = ({ formData, setFormData, mode, loading, handleSubmit, resetForm }) => {

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 space-y-6">
            <div className="border-b pb-2 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-700">
                    {mode === "agregar" ? "Configurar Nueva Vigencia" : `Editando Año ${formData.anio}`}
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                {/* Año */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Año Lectivo
                        <span className="text-[#e74c3c] font-semibold"> *</span></label>
                    <input
                        type="number" name="anio" min="2025"
                        value={formData.anio} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ej: 2026"
                        required
                    />
                </div>

                {/* Fecha Inicio */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Fecha Inicio
                        <span className="text-[#e74c3c] font-semibold"> *</span>
                    </label>
                    <input
                        type="date" name="fechaInicio"
                        value={formData.fechaInicio} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                </div>

                {/* Fecha Fin */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Fecha Finalización
                        <span className="text-[#e74c3c] font-semibold"> *</span>
                    </label>
                    <input
                        type="date" name="fechaFin"
                        value={formData.fechaFin} onChange={handleChange}
                        className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        required
                    />
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                    type="submit" disabled={loading}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 flex items-center"
                >
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {mode === "agregar" ? "Guardar Vigencia" : "Guardar Cambios"}
                </button>
                <button type="button" onClick={resetForm} className="bg-red-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 flex items-center hover:scale-[1.01]">
                    <FontAwesomeIcon icon={faTimes} className="mr-2" /> Cancelar
                </button>
            </div>
        </form>
    );
};

export default VigenciasForm;