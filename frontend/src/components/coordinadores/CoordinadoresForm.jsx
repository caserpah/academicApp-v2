import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes } from "@fortawesome/free-solid-svg-icons";

/**
 * Formulario reutilizable para la creación y edición de Coordinadores.
 */
const CoordinadoresForm = ({
    formData,
    mode,
    loading,
    handleChange,
    handleSubmit,
    resetForm,
}) => {
    const inputBaseClasses =
        "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed text-gray-700";
    const getInputClasses = (readOnly = false) =>
        readOnly ? `${inputBaseClasses} ${readOnlyClasses}` : inputBaseClasses;

    // ==========================
    // Restricciones de entrada
    // ==========================

    // Permitir solo números en documento y contacto
    const handleNumericInput = (e, maxLength = 20) => {
        const { name, value } = e.target;
        const onlyNumbers = value.replace(/\D/g, "").slice(0, maxLength);
        handleChange({ target: { name, value: onlyNumbers } });
    };

    // Convertir nombres a mayúsculas
    const handleNombreInput = (e, maxLength = 100) => {
        const { name, value } = e.target;
        const upperCaseValue = value.toUpperCase().slice(0, maxLength);
        handleChange({ target: { name, value: upperCaseValue } });
    };

    // Validar email en tiempo real
    const handleEmailInput = (e) => {
        const { name, value } = e.target;
        const emailValue = value.toLowerCase().slice(0, 100);
        handleChange({ target: { name, value: emailValue } });
    };

    // ==========================
    // Campos del formulario
    // ==========================
    return (
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-6 border-b pb-3">
                {mode === "agregar" ? "Registrar Nuevo Coordinador" : "Editar Coordinador"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ID (solo lectura) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            ID
                        </label>
                        <input
                            type="text"
                            name="id"
                            value={formData.id || "Nuevo"}
                            disabled
                            className={getInputClasses(true)}
                        />
                    </div>

                    {/* Número de Documento */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Número de Documento{" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="numeroDocumento"
                            value={formData.numeroDocumento}
                            onChange={(e) => handleNumericInput(e, 20)}
                            placeholder="Solo números"
                            maxLength={20}
                            className={getInputClasses()}
                            required
                        />
                    </div>

                    {/* Nombres */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Nombres Completos{" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="nombres"
                            value={formData.nombres}
                            onChange={(e) => handleNombreInput(e, 100)}
                            placeholder="Nombres y apellidos"
                            maxLength={100}
                            className={getInputClasses()}
                            required
                        />
                    </div>

                    {/* Email */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Correo Electrónico{" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleEmailInput}
                            placeholder="ejemplo@colegio.edu.co"
                            maxLength={100}
                            className={getInputClasses()}
                            required
                        />
                        {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                            <p className="text-xs text-red-500 mt-1">Formato de email inválido</p>
                        )}
                    </div>

                    {/* Contacto */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Contacto (10-12 dígitos, opcional)
                        </label>
                        <input
                            type="text"
                            name="contacto"
                            value={formData.contacto}
                            onChange={(e) => handleNumericInput(e, 12)}
                            placeholder="Teléfono de contacto"
                            maxLength={12}
                            inputMode="numeric"
                            className={getInputClasses()}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.contacto && formData.contacto.length < 10 ?
                                "Mínimo 10 dígitos" :
                                "Formato: 10-12 dígitos"
                            }
                        </p>
                    </div>

                    {/* Dirección */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Dirección (opcional)
                        </label>
                        <input
                            type="text"
                            name="direccion"
                            value={formData.direccion}
                            onChange={handleChange}
                            placeholder="Dirección completa"
                            maxLength={200}
                            className={getInputClasses()}
                        />
                    </div>
                </div>

                {/* Botones del formulario */}
                <div className="pt-4 flex justify-center space-x-3 border-t border-[#eee] mt-6">
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 flex items-center"
                        disabled={loading}
                    >
                        <FontAwesomeIcon icon={faSave} className="w-4 h-4 mr-2" />
                        {mode === "agregar" ? "Guardar" : "Guardar Cambios"}
                    </button>

                    <button
                        type="button"
                        onClick={resetForm}
                        className="bg-red-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 flex items-center hover:scale-[1.01]"
                        disabled={loading}
                    >
                        <FontAwesomeIcon icon={faTimes} className="mr-2" />
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CoordinadoresForm;