import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes } from "@fortawesome/free-solid-svg-icons";

/**
 * Formulario reutilizable para la creación y edición de Áreas.
 *
 * Props esperadas:
 * - formData: objeto con los valores actuales del formulario.
 * - handleChange: función para manejar cambios en los campos.
 * - handleCheckboxChange: función para manejar cambios en el checkbox.
 * - handleSubmit: función para enviar el formulario.
 * - resetForm: función para reiniciar el formulario.
 * - loading: estado booleano para bloquear botones mientras carga.
 * - mode: "agregar" | "editar" (define texto y comportamiento).
 * - vigencia: objeto de la vigencia asociada (solo lectura).
 */
const AreasForm = ({
    formData,
    mode,
    loading,
    handleChange,
    handleCheckboxChange,
    handleSubmit,
    resetForm,
    vigencia,
}) => {
    const inputBaseClasses =
        "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-150";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed text-gray-700";
    const getInputClasses = (readOnly = false) =>
        readOnly ? `${inputBaseClasses} ${readOnlyClasses}` : inputBaseClasses;

    // ==========================
    // Restricciones de entrada
    // ==========================

    // Permitir solo alfanuméricos en código y abreviatura
    const handleAlphanumericInput = (e, maxLength = 20) => {
        const { name, value } = e.target;
        const onlyAlphanumeric = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, maxLength);
        handleChange({ target: { name, value: onlyAlphanumeric } });
    };

    // Convertir a mayúsculas automáticamente
    const handleUpperCaseInput = (e, maxLength = 60) => {
        const { name, value } = e.target;
        const upperCaseValue = value.toUpperCase().slice(0, maxLength);
        handleChange({ target: { name, value: upperCaseValue } });
    };

    // ==========================
    // Campos del formulario
    // ==========================
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <div className="border-b pb-2 mb-4 border-[#d8d5d5]">
                    <h3 className="text-lg font-semibold text-gray-700">{mode === "agregar" ? "Registrar Nueva Área" : "Editar Área"}</h3>
                </div>

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

                    {/* Código */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Código {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="codigo"
                            value={formData.codigo}
                            onChange={(e) => handleAlphanumericInput(e, 6)}
                            placeholder="Entre 3-6 caracteres alfanuméricos"
                            maxLength={6}
                            className={getInputClasses()}
                        />
                    </div>

                    {/* Nombre */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Nombre{" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={(e) => handleUpperCaseInput(e, 60)}
                            placeholder="Nombre completo del área"
                            maxLength={60}
                            className={getInputClasses()}
                        />
                    </div>

                    {/* Abreviatura */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Abreviatura{" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="abreviatura"
                            value={formData.abreviatura}
                            onChange={(e) => handleAlphanumericInput(e, 6)}
                            placeholder="Entre 3-6 caracteres alfanuméricos"
                            maxLength={6}
                            className={getInputClasses()}
                        />
                    </div>

                    {/* Promociona (Checkbox) */}
                    <div className="col-span-1">
                        <label className="flex items-center space-x-2 mt-6">
                            <input
                                type="checkbox"
                                name="promociona"
                                checked={formData.promociona}
                                onChange={handleCheckboxChange}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-[#4a5568]">
                                ¿El area promociona?
                            </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                            Si está marcado, el área permite promoción de estudiantes.
                        </p>
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
            </div>
        </form>
    );
};

export default AreasForm;