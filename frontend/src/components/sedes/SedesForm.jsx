import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes } from "@fortawesome/free-solid-svg-icons";

/**
 * Formulario reutilizable para la creación y edición de Sedes.
 *
 * Props esperadas:
 * - formData: objeto con los valores actuales del formulario.
 * - handleChange: función para manejar cambios en los campos.
 * - handleSubmit: función para enviar el formulario.
 * - resetForm: función para reiniciar el formulario.
 * - loading: estado booleano para bloquear botones mientras carga.
 * - mode: "agregar" | "editar" (define texto y comportamiento).
 * - colegio: objeto del colegio asociado (solo lectura).
 */
const SedesForm = ({
    formData,
    mode,
    loading,
    handleChange,
    handleSubmit,
    resetForm,
    colegio,
}) => {
    const inputBaseClasses =
        "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed text-gray-700";
    const getInputClasses = (readOnly = false) =>
        readOnly ? `${inputBaseClasses} ${readOnlyClasses}` : inputBaseClasses;

    // ==========================
    // Restricciones de entrada
    // ==========================

    // Permitir solo números en contacto (máx. 12)
    const handleNumericInput = (e) => {
        const { name, value } = e.target;
        const onlyNumbers = value.replace(/\D/g, "").slice(0, 12);
        handleChange({
            target: {
                name,
                value: onlyNumbers.trim() === "" ? null : onlyNumbers,
            }
        });
    };

    // Permitir solo alfanuméricos en código
    const handleAlphanumericInput = (e) => {
        const { name, value } = e.target;
        const onlyAlphanumeric = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
        handleChange({ target: { name, value: onlyAlphanumeric } });
    };

    // ==========================
    // Campos del formulario
    // ==========================
    return (
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
                        onChange={handleAlphanumericInput}
                        placeholder="Máx. 20 caracteres alfanuméricos"
                        maxLength={20}
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
                        onChange={handleChange}
                        placeholder="Nombre completo de la sede"
                        maxLength={60}
                        className={getInputClasses()}
                    />
                </div>

                {/* Dirección */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Dirección{" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <input
                        type="text"
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleChange}
                        placeholder="Ej: Calle 10 # 5-20"
                        maxLength={80}
                        className={getInputClasses()}
                    />
                </div>

                {/* Contacto */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Contacto (10-12 dígitos, opcional)
                    </label>
                    <input
                        type="text"
                        name="contacto"
                        value={formData.contacto ?? ""}
                        onChange={handleNumericInput}
                        placeholder="Teléfono de contacto"
                        maxLength={12}
                        inputMode="numeric"
                        className={getInputClasses()}
                    />
                </div>

                {/* Campo Colegio ID (solo lectura) */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Institución{" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <select
                        name="colegioId"
                        value={formData.colegioId || ""}
                        onChange={handleChange}
                        required
                        disabled
                        className={getInputClasses(true)}
                    >
                        {colegio ? (
                            <option value={colegio.id}>
                                {colegio.nombre} (ID: {colegio.id})
                            </option>
                        ) : (
                            <option value="">Cargando institución...</option>
                        )}
                    </select>
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
    );
};

export default SedesForm;