import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faToggleOn, faToggleOff } from "@fortawesome/free-solid-svg-icons";

/**
 * Formulario reutilizable para la creación y edición de Juicios.
 *
 * Props esperadas:
 * - formData: objeto con los valores actuales del formulario.
 * - handleChange: función para manejar cambios en los campos.
 * - handleSubmit: función para enviar el formulario.
 * - resetForm: función para reiniciar el formulario.
 * - loading: estado booleano para bloquear botones mientras carga.
 * - mode: "agregar" | "editar" (define texto y comportamiento).
 * - asignaturas: array de asignaturas disponibles.
 * - vigencia: objeto de la vigencia activa (solo lectura).
 */
const JuiciosForm = ({
    formData,
    mode,
    loading,
    handleChange,
    handleSubmit,
    resetForm,
    asignaturas,
    vigencia,
}) => {
    const inputBaseClasses =
        "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed text-gray-700";
    const getInputClasses = (readOnly = false) =>
        readOnly ? `${inputBaseClasses} ${readOnlyClasses}` : inputBaseClasses;

    // ==========================
    // Restricciones de entrada
    // ==========================

    // Permitir solo números decimales para notas
    const handleNumericInput = (e) => {
        const { name, value } = e.target;
        const onlyNumbers = value.replace(/[^0-9.]/g, "");
        const decimalParts = onlyNumbers.split('.');

        // Permitir solo un punto decimal y máximo 2 decimales
        let finalValue = onlyNumbers;
        if (decimalParts.length > 2) {
            finalValue = decimalParts[0] + '.' + decimalParts.slice(1).join('');
        }
        if (decimalParts[1] && decimalParts[1].length > 2) {
            finalValue = decimalParts[0] + '.' + decimalParts[1].substring(0, 2);
        }

        handleChange({ target: { name, value: finalValue } });
    };

    // Permitir solo números enteros para período
    const handlePeriodoInput = (e) => {
        const { name, value } = e.target;
        const onlyNumbers = value.replace(/\D/g, "").slice(0, 1); // Máx 1 dígito (1-4)
        handleChange({ target: { name, value: onlyNumbers } });
    };

    // Manejar toggle de activo
    const handleToggleActivo = () => {
        handleChange({
            target: {
                name: 'activo',
                value: !formData.activo
            }
        });
    };

    // ==========================
    // Campos del formulario
    // ==========================
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-6 border-b pb-3">
                    {mode === "agregar" ? "Nuevo Juicio" : "Editar Juicio"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

                    {/* Tipo (solo lectura) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Tipo {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="tipo"
                            value={formData.tipo || ""}
                            disabled
                            className={getInputClasses(true)}
                        />
                    </div>

                    {/* Grado (solo lectura) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Grado {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="grado"
                            value={formData.grado || ""}
                            disabled
                            className={getInputClasses(true)}
                        />
                    </div>

                    {/* Período */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Período {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="periodo"
                            value={formData.periodo}
                            onChange={handlePeriodoInput}
                            placeholder="1-4"
                            maxLength={1}
                            className={getInputClasses()}
                            required
                        />
                    </div>

                    {/* Dimensión (solo lectura) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Dimensión {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="dimension"
                            value={formData.dimension || ""}
                            disabled
                            className={getInputClasses(true)}
                        />
                    </div>

                    {/* Desempeño */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Desempeño {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="desempeno"
                            value={formData.desempeno}
                            onChange={handleChange}
                            className={getInputClasses()}
                            required
                        >
                            <option value="">Seleccionar...</option>
                            <option value="BA">BA - Básico</option>
                            <option value="ME">ME - Medio</option>
                            <option value="EX">EX - Excelente</option>
                        </select>
                    </div>

                    {/* Nota Mínima */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Nota Mínima {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="minNota"
                            value={formData.minNota}
                            onChange={handleNumericInput}
                            placeholder="0.0 - 10.0"
                            className={getInputClasses()}
                            required
                        />
                    </div>

                    {/* Nota Máxima */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Nota Máxima {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <input
                            type="text"
                            name="maxNota"
                            value={formData.maxNota}
                            onChange={handleNumericInput}
                            placeholder="0.0 - 10.0"
                            className={getInputClasses()}
                            required
                        />
                    </div>

                    {/* Asignatura */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Asignatura {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="asignaturaId"
                            value={formData.asignaturaId || ""}
                            onChange={handleChange}
                            className={getInputClasses()}
                            required
                        >
                            <option value="">Seleccionar asignatura...</option>
                            {asignaturas.map((asignatura) => (
                                <option key={asignatura.id} value={asignatura.id}>
                                    {asignatura.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Vigencia (solo lectura) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Vigencia {" "}
                            <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="vigenciaId"
                            value={formData.vigenciaId || ""}
                            onChange={handleChange}
                            disabled
                            className={getInputClasses(true)}
                            required
                        >
                            {vigencia ? (
                                <option value={vigencia.id}>
                                    {vigencia.anio} - {vigencia.descripcion}
                                </option>
                            ) : (
                                <option value="">Cargando vigencia...</option>
                            )}
                        </select>
                    </div>

                    {/* Activo - Toggle Style */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Estado
                        </label>
                        <button
                            type="button"
                            onClick={handleToggleActivo}
                            className={`flex items-center space-x-3 w-full px-4 py-2 rounded-lg border transition duration-150 ${
                                formData.activo
                                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                    : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                            }`}
                            disabled={loading}
                        >
                            {formData.activo ? (
                                <>
                                    <FontAwesomeIcon icon={faToggleOn} className="text-green-600 text-xl" />
                                    <span className="font-medium">Activo</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faToggleOff} className="text-red-600 text-xl" />
                                    <span className="font-medium">Inactivo</span>
                                </>
                            )}
                        </button>
                        <input
                            type="hidden"
                            name="activo"
                            value={formData.activo}
                        />
                    </div>
                </div>

                {/* Texto del Juicio */}
                <div className="mt-6">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Texto del Juicio {" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <textarea
                        name="texto"
                        value={formData.texto}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Ingrese el texto descriptivo del juicio..."
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
                        required
                    />
                </div>

                {/* Botones del formulario */}
                <div className="pt-6 flex justify-center space-x-3 border-t border-[#eee] mt-6">
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

export default JuiciosForm;