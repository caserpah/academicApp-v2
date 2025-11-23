import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const ColegiosForm = ({
    formData,
    isEditing,
    loading,
    handleInputChange,
    handleSubmit,
    handleCancel,
}) => {
    const inputBaseClasses =
        "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 shadow-sm";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed text-gray-700";
    const getInputClasses = (readOnly = false) =>
        readOnly ? `${inputBaseClasses} ${readOnlyClasses}` : inputBaseClasses;

    // =========================
    // Restricciones de entrada
    // =========================
    const handleNumericInput = (e) => {
        const { name, value } = e.target;
        const onlyNumbers = value.replace(/\D/g, "");
        // usa el handler del padre para mantener un solo flujo de estado
        handleInputChange({ target: { name, value: onlyNumbers } });
    };

    const handleAlphanumericInput = (e) => {
        const { name, value } = e.target;
        const onlyAlphanumeric = value.replace(/[^a-zA-Z0-9]/g, "");
        handleInputChange({ target: { name, value: onlyAlphanumeric } });
    };

    // Bloqueo adicional desde teclado para campos numéricos
    const handleKeyDownNumeric = (e) => {
        // Permitir atajos de teclado comunes (Ctrl + C, Ctrl + V, Ctrl + X, Ctrl + A, Ctrl + Backspace)
        const ctrlCombo =
            (e.ctrlKey || e.metaKey) && // ⌘ en Mac
            ["c", "v", "x", "a", "z","Backspace"].includes(e.key.toLowerCase());

        // Permitir dígitos 0–9 y teclas de control (mover, borrar, etc.)
        const allowed =
            /[0-9]/.test(e.key) ||
            ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete", "Home", "End"].includes(e.key) ||
            ctrlCombo;

        if (!allowed) e.preventDefault();

    };

    // Definición de campos y su “modo” de control
    const fields = [
        // Solo lectura permanente
        { name: "registroDane", label: "Registro DANE", required: true, readOnlyAlways: true, mode: "alphanumeric" },
        { name: "nombre", label: "Nombre", required: true, readOnlyAlways: true },

        // Editables con restricciones
        { name: "email", label: "Email", type: "email", placeholder: "correo@institucion.edu.co" },
        { name: "contacto", label: "Número de contacto", mode: "numeric", maxLength: 12 },
        { name: "direccion", label: "Dirección", required: true, maxLength: 80 },
        { name: "ciudad", label: "Ciudad", required: true, maxLength: 20 },
        { name: "departamento", label: "Departamento", required: true, maxLength: 20 },
        { name: "resolucion", label: "Resolución", required: true, mode: "alphanumeric", maxLength: 10 },
        { name: "fechaResolucion", label: "Fecha Resolución", type: "date", required: true },
        { name: "promocion", label: "Decreto Promoción", required: true, mode: "alphanumeric", maxLength: 10 },
        { name: "fechaPromocion", label: "Fecha Decreto", type: "date", required: true },
        { name: "secretaria", label: "Secretaría", required: true, maxLength: 80 },
        { name: "ccSecretaria", label: "Cédula Secretaría", required: true, mode: "numeric", maxLength: 15 },
        { name: "director", label: "Rector", required: true, maxLength: 80 },
        { name: "ccDirector", label: "Cédula Rector", required: true, mode: "numeric", maxLength: 15 },
    ];

    // Selección de handler según “modo”
    const pickOnChange = (mode) => {
        if (!isEditing) return undefined; // en solo-lectura no procesamos
        if (mode === "numeric") return handleNumericInput;
        if (mode === "alphanumeric") return handleAlphanumericInput;
        return handleInputChange;
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* ID solo lectura */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-2">
                <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">ID</label>
                    <input
                        type="text"
                        name="id"
                        value={formData.id || ""}
                        readOnly
                        className={getInputClasses(true)}
                    />
                </div>
            </div>

            {/* Campos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {fields.map(({ name, label, type = "text", required, mode, readOnlyAlways, placeholder, maxLength }) => {
                    const readOnly = readOnlyAlways || !isEditing;
                    const commonProps = {
                        type,
                        name,
                        value: formData[name] || "",
                        required,
                        readOnly,
                        className: getInputClasses(readOnly),
                        placeholder,
                        maxLength,
                    };

                    // Añadir props específicos por modo
                    const onChange = pickOnChange(mode);
                    const onKeyDown = mode === "numeric" && isEditing ? handleKeyDownNumeric : undefined;

                    // Acompañar con pattern nativo (ayuda al teclado móvil y validación HTML5)
                    const pattern =
                        mode === "numeric" ? "\\d*" :
                            mode === "alphanumeric" ? "[A-Za-z0-9]*" :
                                undefined;

                    return (
                        <div key={name} className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">
                                {label} {required && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                {...commonProps}
                                onChange={onChange}
                                onKeyDown={onKeyDown}
                                pattern={pattern}
                                inputMode={mode === "numeric" ? "numeric" : undefined}
                                autoComplete="off"
                            />
                        </div>
                    );
                })}
            </div>

            {/* Botones */}
            {isEditing && (
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="px-6 py-2 bg-[#e74c3c] text-white rounded-lg shadow-md hover:bg-[#c0392b] transition duration-300 ease-in-out flex items-center disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]"
                        disabled={loading}
                    >
                        Cancelar
                        <FontAwesomeIcon icon="fa-xmark" className="ml-2" />
                    </button>

                    <button
                        type="submit"
                        className="px-6 py-2 bg-[#4299e1] text-white rounded-lg shadow-md hover:bg-[#2980b9] transition duration-300 ease-in-out flex items-center disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01]"
                        disabled={loading}
                    >
                        Actualizar información
                        <FontAwesomeIcon icon="fa-floppy-disk" className="ml-2" />
                    </button>
                </div>
            )}
        </form>
    );
};

export default ColegiosForm;